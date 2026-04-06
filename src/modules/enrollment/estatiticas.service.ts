import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EstudanteDTO } from './dto/estudante.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

@Injectable()
export class EstudantesService {
  constructor(private dataSource: DataSource) { }

async findEstudantes(estudanteDto: EstudanteDTO) {
    const { 
      curso, genero, anoLectivo, page = 1, limit = 10, 
      search, estadoMatricula, anoCurricular, estadoAprovacao 
    } = estudanteDto;
    
    const offset = (page - 1) * limit;

    // 1. QUERY PRINCIPAL OTIMIZADA
    // Trazemos contadores e classe calculada em uma única viagem ao Oracle
    const baseQuery = this.dataSource
      .createQueryBuilder()
      .from("FK2_TB_MATRICULAS", "TM")
      .select("TM.CODIGO", "matricula")
      .addSelect("TP.Nome_Completo", "nome")
      .addSelect("TC.Designacao", "curso")
      .addSelect("TP.Sexo", "genero")
      .addSelect("TAL.Designacao", "ano_lectivo_nome")
      
      // Subquery: Determina a classe mais alta do aluno no ano lectivo
      .addSelect(`(
        SELECT TGC_SUB.CODIGO_CLASSE 
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO TGCA_SUB
        INNER JOIN FK2_TB_GRADE_CURRICULAR TGC_SUB ON TGC_SUB.CODIGO = TGCA_SUB.CODIGO_GRADE_CURRICULAR
        WHERE TGCA_SUB.CODIGO_MATRICULA = TM.CODIGO 
        AND TGCA_SUB.CODIGO_ANO_LECTIVO = :anoLectivo
        ORDER BY TGC_SUB.CODIGO_CLASSE DESC
        FETCH FIRST 1 ROWS ONLY
      )`, "classe_id")

      // Subqueries: Contadores para regra dos 80% (Aprovações)
      .addSelect(`(
        SELECT COUNT(*) FROM FK2_TB_GRADE_CURRICULAR_ALUNO 
        WHERE CODIGO_MATRICULA = TM.CODIGO AND CODIGO_ANO_LECTIVO = :anoLectivo 
        AND CODIGO_STATUS_GRADE_CURRICULAR IN (1,2,3)
      )`, "total_inscritas")
      .addSelect(`(
        SELECT COUNT(*) FROM FK2_TB_GRADE_CURRICULAR_ALUNO 
        WHERE CODIGO_MATRICULA = TM.CODIGO AND CODIGO_ANO_LECTIVO = :anoLectivo 
        AND CODIGO_STATUS_GRADE_CURRICULAR = 3
      )`, "total_aprovadas")

      .innerJoin("FK2_TB_CURSOS", "TC", "TC.CODIGO = TM.CODIGO_CURSO")
      .innerJoin("FK2_TB_ADMISSAO", "TA", "TA.CODIGO = TM.CODIGO_ALUNO")
      .innerJoin("FK2_TB_PREINSCRICAO", "TP", "TP.CODIGO = TA.PRE_INCRICAO")
      .innerJoin("FK2_TB_ANO_LECTIVO", "TAL", "TAL.CODIGO = :anoLectivo", { anoLectivo })
      
      // Garante que só buscamos alunos com registos no ano selecionado
      .where("EXISTS (SELECT 1 FROM FK2_TB_GRADE_CURRICULAR_ALUNO X WHERE X.CODIGO_MATRICULA = TM.CODIGO AND X.CODIGO_ANO_LECTIVO = :anoLectivo)", { anoLectivo });

    // Filtros Dinâmicos de SQL
    if (curso && curso !== 0) baseQuery.andWhere("TC.CODIGO = :curso", { curso });
    if (genero && genero.toLowerCase() !== "todos") baseQuery.andWhere("UPPER(TP.SEXO) = :genero", { genero: genero.toUpperCase() });
    if (search) baseQuery.andWhere("UPPER(TP.Nome_Completo) LIKE UPPER(:search)", { search: `%${search}%` });

    // 2. BUSCA E PROCESSAMENTO
    const rawResults = await baseQuery.orderBy("TP.Nome_Completo", "ASC").getRawMany();

    // Processamento em paralelo para evitar gargalos de I/O
    const promessas = rawResults.map(async (raw) => {
      const item = toLowerCaseKeys(raw);

      // Filtro de Ano Curricular (Classe)
      if (anoCurricular && Number(item.classe_id) !== Number(anoCurricular)) return null;

      // Lógica complexa de Estado de Matrícula (Financeiro/Bolsas)
      const situacao = await this.estadoMatricula(item.matricula);

      // --- CÁLCULO E FILTRO DE ESTADO DE APROVAÇÃO ---
      let statusCalculado = "Reprovado";
      const inscritas = Number(item.total_inscritas) || 0;
      const aprovadas = Number(item.total_aprovadas) || 0;

      if (situacao?.designacao?.toUpperCase() === "DIPLOMADO") {
        statusCalculado = "Aprovado"; 
      } else if (inscritas > 0) {
        const aproveitamento = (aprovadas / inscritas) * 100;
        statusCalculado = aproveitamento >= 80 ? "Aprovado" : "Reprovado";
      } else {
        statusCalculado = "Sem Notas";
      }

      // Filtro por Estado de Aprovação (Vindo do Dropdown)
      // Se estadoAprovacao for "Aprovado" ou "Reprovado", comparamos aqui
      if (estadoAprovacao && estadoAprovacao !== 0 && estadoAprovacao !== 0) {
          if (statusCalculado !== estadoAprovacao.toString()) return null;
      }

      // Filtro por Estado de Matrícula (Financeiro)
      if (estadoMatricula && estadoMatricula !== 0 && situacao?.codigo !== estadoMatricula) return null;

      return {
        matricula: item.matricula,
        nome: item.nome,
        curso: item.curso,
        genero: item.genero,
        estadoMatricula: situacao?.designacao || 'N/A',
        cor: situacao?.obs || '#000000',
        anoLectivo: item.ano_lectivo_nome,
        classe: item.classe_id,
        estadoAprovacao: statusCalculado
      };
    });

    const resultadosFiltrados = (await Promise.all(promessas)).filter(res => res !== null);

    // 3. PAGINAÇÃO MANUAL (Necessária devido aos filtros de código)
    return resultadosFiltrados.slice(offset, offset + limit);
  }

  // --- LÓGICA DE ESTADO (FINANCEIRO / ACADÉMICO) ---

  private async estadoMatricula(matriculaEstudante: number) {
    const dataActual = new Date();
    const anoLectivo = await this.anoLectivoActual();
    const estadoMatriculaStr = await this.obterStatusMatricula(matriculaEstudante);
    const dadosMesCorrente = await this.buscarMesCorrente(dataActual);
    const anoAnterior = await this.obterAnoLectivoAnterior(anoLectivo.ordem);

    if (estadoMatriculaStr?.toUpperCase() === "DIPLOMADO") return await this.matriculaSituacaoBySigla("E");

    if (estadoMatriculaStr?.toUpperCase() === "INACTIVO") {
      const mesTemp = await this.buscarUltimaParcelaPagaMesTemp(matriculaEstudante, anoLectivo.codigo);
      if (mesTemp) {
        if (mesTemp.prestacao < 4 && new Date(mesTemp.datalimite) < dataActual) return await this.matriculaSituacaoBySigla("IDAC");
        if (await this.seTemIsencao(matriculaEstudante, anoAnterior.codigo, dadosMesCorrente?.nPrestacao) > 0) return await this.matriculaSituacaoBySigla("AI");
        if (await this.findBolsa100p(matriculaEstudante, anoAnterior.codigo)) return await this.matriculaSituacaoBySigla("AI");
      }
      return await this.matriculaSituacaoBySigla("IDAA");
    }

    const tipoCandidatura = await this.obterTipoCandidatura(matriculaEstudante);
    if (tipoCandidatura === 1 && await this.temConfirmacao(matriculaEstudante, anoLectivo.codigo)) {
      const mesTemp = await this.buscarUltimaParcelaPagaMesTemp(matriculaEstudante, anoLectivo.codigo);
      if (mesTemp && mesTemp.prestacao >= dadosMesCorrente?.nPrestacao) return await this.matriculaSituacaoBySigla("AR");
      return await this.matriculaSituacaoBySigla("AI");
    }

    return await this.matriculaSituacaoBySigla("IN");
  }

  // --- MÉTODOS AUXILIARES ---

  async obterStatusMatricula(codigo: number): Promise<string | null> {
    const res = await this.dataSource.createQueryBuilder()
      .select("M.ESTADO_MATRICULA", "status") 
      .from("FK2_TB_MATRICULAS", "M")
      .where("M.CODIGO = :codigo", { codigo })
      .getRawOne();
    return res?.status ?? null;
  }

  private async matriculaSituacaoBySigla(sigla: string) {
    const situacao = await this.dataSource.createQueryBuilder()
      .select("*")
      .from("FK2_TB_ESTADO_MATRICULA", "EM")
      .where("UPPER(EM.SIGLA) = :sigla", { sigla: sigla.toUpperCase() })
      .getRawOne();
    return toLowerCaseKeys(situacao);
  }

  private async anoLectivoActual() {
    const res = await this.dataSource.createQueryBuilder()
      .select("*").from("FK2_TB_ANO_LECTIVO", "AL")
      .where("UPPER(AL.ESTADO) = :activo", { activo: "ACTIVO" })
      .getRawOne();
    return res ? toLowerCaseKeys(res) : null;
  }

  private async buscarMesCorrente(data: Date) {
    const ano = await this.anoLectivoActual();
    if (!ano) return null;
    const res = await this.dataSource.createQueryBuilder()
      .select(["MT.data_limite", "MT.prestacao"])
      .from("FK2_MES_TEMP", "MT")
      .where("MT.ANO_LECTIVO = :ano", { ano: ano.codigo })
      .andWhere(":data BETWEEN MT.DATA_INICIAL AND MT.DATA_FINAL", { data })
      .getRawOne();
    return res ? { dataLimiteDoMesCorrente: res.data_limite, nPrestacao: res.prestacao } : null;
  }

  private async buscarUltimaParcelaPagaMesTemp(numMatricula: number, anoLectivo: number) {
     const res = await this.dataSource.query(`
        SELECT MT.* FROM FK2_FACTURA FA
        INNER JOIN FK2_FACTURA_ITEMS FI ON FI.CODIGOFACTURA = FA.CODIGO
        INNER JOIN FK2_MES_TEMP MT ON MT.ID = FI.MES_TEMP_ID
        WHERE FA.CODIGOMATRICULA = :1 AND FA.ANO_LECTIVO = :2 AND FI.ESTADO = 1
        ORDER BY MT.PRESTACAO DESC
        FETCH FIRST 1 ROWS ONLY
     `, [numMatricula, anoLectivo]);
     return res.length > 0 ? toLowerCaseKeys(res[0]) : null;
  }

  private async obterAnoLectivoAnterior(ordemActual: number) {
    const res = await this.dataSource.createQueryBuilder()
      .from("FK2_TB_ANO_LECTIVO", "AL")
      .where("AL.ORDEM = :ordem", { ordem: ordemActual - 1 })
      .getRawOne();
    return res ? toLowerCaseKeys(res) : null;
  }

  async seTemIsencao(numMatricula: number, anoLectivo: number, prestacao: number): Promise<number> {
    const res = await this.dataSource.createQueryBuilder()
      .select("MAX(MT.PRESTACAO)", "max")
      .from("FK2_TB_ISENCOES", "TI")
      .innerJoin("FK2_MES_TEMP", "MT", "MT.ID = TI.MES_TEMP_ID")
      .where("TI.CODIGO_MATRICULA = :numMatricula AND TI.CODIGO_ANOLECTIVO = :anoLectivo", { numMatricula, anoLectivo })
      .andWhere("TI.ESTADO_ISENSAO = 'Activo' AND MT.PRESTACAO <= :prestacao", { prestacao })
      .getRawOne();
    return Number(res?.max) || 0;
  }

  async findBolsa100p(matricula: number, anoLectivo: number): Promise<boolean> {
    const res = await this.dataSource.createQueryBuilder()
      .select("COUNT(*)", "total").from("FK2_TB_BOLSEIROS", "TB")
      .where("TB.CODIGO_MATRICULA = :matricula AND TB.STATUS_ = 0", { matricula })
      .andWhere("TB.DESCONTO IN (0, 100) AND TB.CODIGO_ANOLECTIVO = :anoLectivo", { anoLectivo })
      .getRawOne();
    return Number(res?.total) > 0;
  }

  async temConfirmacao(numMatricula: number, anoLectivo: number): Promise<boolean> {
    const res = await this.dataSource.createQueryBuilder()
      .select("COUNT(*)", "total").from("FK2_TB_GRADE_CURRICULAR_ALUNO", "TGCA")
      .where("TGCA.CODIGO_STATUS_GRADE_CURRICULAR IN (2, 3) AND TGCA.CODIGO_ANO_LECTIVO = :anoLectivo", { anoLectivo })
      .andWhere("TGCA.CODIGO_MATRICULA = :numMatricula AND TGCA.EQUIVALENCIA = 0", { numMatricula })
      .getRawOne();
    return Number(res?.total) > 0;
  }

  private async obterTipoCandidatura(numMatricula: number): Promise<number> {
    const res = await this.dataSource.createQueryBuilder()
      .select("TP.CODIGO_TIPO_CANDIDATURA", "id")
      .from("FK2_TB_MATRICULAS", "TM")
      .innerJoin("FK2_TB_ADMISSAO", "TA", "TA.CODIGO = TM.CODIGO_ALUNO")
      .innerJoin("FK2_TB_PREINSCRICAO", "TP", "TP.CODIGO = TA.PRE_INCRICAO")
      .where("TM.CODIGO = :numMatricula", { numMatricula })
      .getRawOne();
    return Number(res?.id) || 0;
  }


async estadoMatriculaDropdown() {
  const resultado = await this.dataSource.createQueryBuilder()
    .select("TM.CODIGO", "codigo")
    .addSelect("TM.DESIGNACAO", "designacao")
    .from("FK2_TB_ESTADO_MATRICULA", "TM")
    .where("TM.ACTIVESTATE = :activo", { activo: 1 })
    .getRawMany();
  return resultado ? toLowerCaseKeys(resultado) : null;
}
}







