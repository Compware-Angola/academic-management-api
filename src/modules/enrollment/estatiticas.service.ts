import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EstudanteDTO } from './dto/estudante.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

@Injectable()
export class EstudantesService {
  constructor(private dataSource: DataSource) { }

 async findEstudantes(estudanteDto: EstudanteDTO) {
  const { curso, genero, anoLectivo, page = 1, limit = 10, search, estadoMatricula } = estudanteDto;

  const offset = (page - 1) * limit;

  // 1. Construção da Query Base (Já tínhamos)
  const baseQuery = this.dataSource
    .createQueryBuilder()
    .from("FK2_TB_GRADE_CURRICULAR_ALUNO", "TGCA")
    .select("TM.CODIGO", "matricula")
    .addSelect("TP.Nome_Completo", "nome")
    .addSelect("TC.Designacao", "curso")
    .addSelect("TP.Sexo", "genero")
    .innerJoin("FK2_TB_MATRICULAS", "TM", "TM.CODIGO = TGCA.CODIGO_MATRICULA")
    .innerJoin("FK2_TB_CURSOS", "TC", "TC.CODIGO = TM.CODIGO_CURSO")
    .innerJoin("FK2_TB_ADMISSAO", "TA", "TA.CODIGO = TM.CODIGO_ALUNO")
    .innerJoin("FK2_TB_PREINSCRICAO", "TP", "TP.CODIGO = TA.PRE_INCricao")
    .distinct(true)
    .orderBy("TP.Nome_Completo", "ASC");

  // Filtros Dinâmicos (Equivalente ao IF/ELSE do Java)
  if (anoLectivo) {
    baseQuery.andWhere("TGCA.CODIGO_ANO_LECTIVO = :anoLectivo", { anoLectivo });
  }

  if (curso && curso !== 0) {
    baseQuery.andWhere("TC.CODIGO = :curso", { curso });
  }

  if (genero && genero.toLowerCase() !== "todos") {
    baseQuery.andWhere("UPPER(TP.SEXO) = :genero", { genero: genero.toUpperCase() });
  }

  if (search) {
    baseQuery.andWhere("UPPER(TP.Nome_Completo) LIKE UPPER(:search)", { search: `%${search}%` });
  }

  // Executa a busca inicial
  const rawResults = await baseQuery.getRawMany();
  const listaFinal:any[] = [];

  // 2. Loop de Processamento (Onde a mágica do Estado acontece)
  for (const rawEstudante of rawResults) {
    const estudante = toLowerCaseKeys(rawEstudante);
    
    // Chamada ao nosso método refatorado com Return Early
    const situacao = await this.estadoMatricula(estudante.matricula);

    // Filtro de Estado (Equivalente ao if (estadoMatricula == estadoMatriculaAluno.getCodigo() || estadoMatricula == 0))
    if (!estadoMatricula || estadoMatricula === 0 || situacao?.codigo === estadoMatricula) {
      listaFinal.push({
        matricula: estudante.matricula,
        nome: estudante.nome,
        curso: estudante.curso,
        genero: estudante.genero,
        estadoMatricula: situacao?.designacao || 'N/A',
        cor: situacao?.obs || '#000000'
      });
    }
  }

  // 3. Paginação Manual (Como o filtro de estado acontece no código, a paginação do SQL pode falhar)
  // Se a lista for muito grande, o ideal é filtrar o estado via SQL, 
  // mas para manter a lógica do Java (Manager), fazemos assim:
  return listaFinal.slice(offset, offset + limit);
}

  private async matriculaSituacaoBySigla(sigla: string) {
    const situacao = await this.dataSource.createQueryBuilder()
      .select("*")
      .from("FK2_TB_ESTADO_MATRICULA", "EM")
      .where("UPPER(EM.SIGLA) = :sigla", { sigla: sigla.toUpperCase() })
      .getRawOne();
      console.log("situacao")
      console.log({situacao})
    return toLowerCaseKeys(situacao);

  }


  private async estadoMatricula(matriculaEstudante: number) {
    const dataActual = new Date();
    const anoLectivo = await this.anoLectivoActual();
    const estadoMatricula = await this.obterStatusMatricula(matriculaEstudante);
    const dadosMesCorrente = await this.buscarMesCorrente(dataActual);
    const anoAnterior = await this.obterAnoLectivoAnterior(anoLectivo.ordem);
   // --- BLOCO 1: DIPLOMADO ---
    if (estadoMatricula?.toUpperCase() === "DIPLOMADO") {
      return await this.matriculaSituacaoBySigla("E");
    }

    // --- BLOCO 2: INACTIVO ---
    if (estadoMatricula?.toUpperCase() === "INACTIVO") {
      const mesTemp = await this.buscarUltimaParcelaPagaMesTemp(matriculaEstudante, anoLectivo.codigo);

      if (mesTemp) {
        if (mesTemp.prestacao < 4 && new Date(mesTemp.datalimite) < dataActual) {
          return await this.matriculaSituacaoBySigla("IDAC");
        }
        
        const isento = await this.seTemIsencao(matriculaEstudante, anoAnterior.codigo, dadosMesCorrente?.nPrestacao);
        if (isento > 0 && isento <= dadosMesCorrente?.nPrestacao) {
          return await this.matriculaSituacaoBySigla("AI");
        }

        const eBolseiro100 = await this.findBolsa100p(matriculaEstudante, anoAnterior.codigo);
        if (!eBolseiro100) return await this.matriculaSituacaoBySigla("IN");
      }

      // Se mesTemp for null ou não caiu nos retornos acima
      if (await this.temConfirmacao(matriculaEstudante, anoLectivo.codigo)) return await this.matriculaSituacaoBySigla("IDAC");
      if (await this.seTemIsencaoNoAnoAnterior(matriculaEstudante, anoAnterior.codigo) > 0) return await this.matriculaSituacaoBySigla("AI");
      if (await this.findBolsa100p(matriculaEstudante, anoAnterior.codigo)) return await this.matriculaSituacaoBySigla("AI");
      
      return await this.matriculaSituacaoBySigla("IDAA");
    }

    // --- BLOCO 3: PÓS-GRADUAÇÃO (Não ID 1) ---
    // Nota: Você precisará buscar o tipo de candidatura na sua query de matricula
    const tipoCandidatura = await this.obterTipoCandidatura(matriculaEstudante); // FALTA
    if (tipoCandidatura !== 1) {
      const sigla = estadoMatricula?.toUpperCase() === "ACTIVO" ? "AR" : "IN";
      return await this.matriculaSituacaoBySigla(sigla);
    }

    // --- BLOCO 4: LICENCIATURA COM CONFIRMAÇÃO ---
    const temConf = await this.temConfirmacao(matriculaEstudante, anoLectivo.codigo);
    if (temConf) {
      if (await this.findBolsa100p(matriculaEstudante, anoLectivo.codigo)) {
        return await this.matriculaSituacaoBySigla("AR");
      }

      const mesTemp = await this.buscarUltimaParcelaPagaMesTemp(matriculaEstudante, anoLectivo.codigo);
      const isentoAnoActual = await this.seTemIsencao(matriculaEstudante, anoLectivo.codigo, dadosMesCorrente?.nPrestacao);

      if (mesTemp) {
        if (isentoAnoActual > 0 && isentoAnoActual <= dadosMesCorrente?.nPrestacao) return await this.matriculaSituacaoBySigla("AR");
        if (mesTemp.prestacao >= dadosMesCorrente?.nPrestacao) return await this.matriculaSituacaoBySigla("AR");
        
        if ((dadosMesCorrente?.nPrestacao - 1) === mesTemp.prestacao) {
          return (dataActual <= new Date(dadosMesCorrente?.dataLimiteDoMesCorrente)) 
            ? await this.matriculaSituacaoBySigla("AR") 
            : await this.matriculaSituacaoBySigla("AI");
        }
        return await this.matriculaSituacaoBySigla("AI");
      } 
      
      // Caso não pagou nenhum mês
      if (await this.findBolsa100p(matriculaEstudante, anoLectivo.codigo)) return await this.matriculaSituacaoBySigla("AR");
      if (isentoAnoActual > 0) return await this.matriculaSituacaoBySigla("AR");
      
      return await this.matriculaSituacaoBySigla("AI");
    }



   // --- BLOCO 5: LICENCIATURA SEM CONFIRMAÇÃO ---
    const mesTempFinal = await this.buscarUltimaParcelaPagaMesTemp(matriculaEstudante, anoLectivo.codigo);
    if (mesTempFinal) {
      if (mesTempFinal.prestacao < 10 && new Date(mesTempFinal.datalimite) < dataActual) {
        return await this.matriculaSituacaoBySigla("IDAA");
      }
      if (estadoMatricula?.toUpperCase() === "INACTIVO") return await this.matriculaSituacaoBySigla("IN");
    }

    if (await this.findBolsa100p(matriculaEstudante, anoLectivo.codigo)) return await this.matriculaSituacaoBySigla("AR");

    return await this.matriculaSituacaoBySigla("IN");
  }

  async obterStatusMatricula(codigo: number): Promise<string | null> {
  const resultado = await this.dataSource.createQueryBuilder()
    .select("M.ESTADO_MATRICULA", "status") 
    .from("FK2_TB_MATRICULAS", "M")
    .where("M.CODIGO = :codigo", { codigo })
    .getRawOne();

  return resultado?.status ?? null; 
}

private async buscarMesCorrente(dataActual:Date) {
const anoLectivoResult = await this.anoLectivoActual();
if(anoLectivoResult === null) {
  return null;
}
const anoLectivo = anoLectivoResult.codigo;
const resultado = await this.dataSource.createQueryBuilder()
  .select([
    "MT.data_limite AS data_limite", 
    "MT.prestacao AS prestacao"
  ])
  .from("FK2_MES_TEMP", "MT")
  .where("MT.ANO_LECTIVO = :anoLectivo", { anoLectivo })
  .andWhere("MT.DATA_INICIAL <= :data", { data: dataActual })
  .andWhere("MT.DATA_FINAL >= :data", { data: dataActual })
  .getRawOne();

  return resultado? {dataLimiteDoMesCorrente: toLowerCaseKeys(resultado).data_limite, nPrestacao: toLowerCaseKeys(resultado).prestacao} : null;
}

private async anoLectivoActual() {
  const resultado = await this.dataSource.createQueryBuilder()
    .select("*",)
    .from("FK2_TB_ANO_LECTIVO", "AL")
    .where("UPPER(AL.ESTADO) = :activo", { activo: "ACTIVO" })
    .getRawOne();
  return resultado ? toLowerCaseKeys(resultado) : null;
}

private async buscarUltimaParcelaPagaMesTemp(numMatricula: number, anoLectivo: number) {
  const subQueryMaxPrestacao = this.dataSource
    .createQueryBuilder()
    .select("MAX(MT.PRESTACAO)")
    .from("FK2_FACTURA", "FA_SUB")
    .innerJoin("FK2_FACTURA_ITEMS", "FI_SUB", "FI_SUB.CODIGOFACTURA = FA_SUB.CODIGO")
    .innerJoin("FK2_MES_TEMP", "MT", "MT.ID = FI_SUB.MES_TEMP_ID")
    .where("FA_SUB.CODIGOMATRICULA = :numMatricula")
    .andWhere("FA_SUB.ANO_LECTIVO = :anoLectivo")
    .andWhere("FI_SUB.MES_TEMP_ID IS NOT NULL")
    .andWhere("FI_SUB.ESTADO = 1")
    .andWhere("MT.ANO_LECTIVO = FA_SUB.ANO_LECTIVO");

  const resultado = await this.dataSource.createQueryBuilder()
    .select("MT2.PRESTACAO", "prestacao")
    .addSelect("MT2.DESIGNACAO", "designacao")
    .addSelect("MT2.ACTIVO", "estado")
    .addSelect("MT2.ANO_LECTIVO", "anoLectivo")
    .addSelect("MT2.ORDEM_MES", "ordem")
    .addSelect("MT2.DATA_LIMITE", "dataLimite")
    .addSelect("MT2.DATA_INICIAL", "dataInicial")
    .addSelect("MT2.DATA_FINAL", "dataFinal")
    .from("FK2_FACTURA", "FA")
    .innerJoin("FK2_FACTURA_ITEMS", "FI", "FI.CODIGOFACTURA = FA.CODIGO")
    .innerJoin("FK2_MES_TEMP", "MT2", "MT2.ID = FI.MES_TEMP_ID")
    .where("FA.CODIGOMATRICULA = :numMatricula", { numMatricula })
    .andWhere("FA.ANO_LECTIVO = :anoLectivo", { anoLectivo })
    .andWhere("MT2.ANO_LECTIVO = FA.ANO_LECTIVO")
    .andWhere(`MT2.PRESTACAO = (${subQueryMaxPrestacao.getQuery()})`)
    .setParameters(subQueryMaxPrestacao.getParameters()) 
    .getRawOne(); 

  return resultado ? toLowerCaseKeys(resultado) : null;
}
private async obterAnoLectivoAnterior(ordemActual: number) {
  const res = await this.dataSource.createQueryBuilder()
    .from("FK2_TB_ANO_LECTIVO", "AL")
    .where("AL.ORDEM = :ordem", { ordem: ordemActual - 1 })
    .getRawOne();
  return res ? toLowerCaseKeys(res) : null;
}
async seTemIsencao(numMatricula: number, anoLectivo: number, prestacao: number): Promise<number> {
  // Caso prestacao venha null por algum erro de busca anterior, evitamos erro de query
  if (!prestacao) return 0;

  const resultado = await this.dataSource.createQueryBuilder()
    .select("MAX(MT.PRESTACAO)", "max_prestacao")
    .from("FK2_TB_ISENCOES", "TI") // Ajustado com o prefixo FK2 que você está usando
    .innerJoin("FK2_MES_TEMP", "MT", "MT.ID = TI.MES_TEMP_ID")
    .where("TI.CODIGO_MATRICULA = :numMatricula", { numMatricula })
    .andWhere("TI.CODIGO_ANOLECTIVO = :anoLectivo", { anoLectivo })
    .andWhere("TI.ESTADO_ISENSAO = :estado", { estado: 'Activo' })
    .andWhere("MT.PRESTACAO <= :prestacao", { prestacao })
    .getRawOne();

  // No TypeORM, o MAX() pode retornar string ou null no RawOne
  // Convertemos para Number e usamos o operador ?? para garantir o 0
  console.log({seTemIsencao: resultado})
  return Number(resultado?.max_prestacao) || 0;
}
async findBolsa100p(matricula: number, anoLectivo: number): Promise<boolean> {
  const resultado = await this.dataSource.createQueryBuilder()
    // Contamos manualmente o campo
    .select("COUNT(TB.CODIGO)", "total") 
    .from("FK2_TB_BOLSEIROS", "TB")
    .where("TB.CODIGO_MATRICULA = :matricula", { matricula })
    .andWhere("TB.STATUS_ = :status", { status: 0 })
    .andWhere("TB.DESCONTO IN (:...descontos)", { descontos: [0, 100] })
    .andWhere("TB.CODIGO_ANOLECTIVO = :anoLectivo", { anoLectivo })
    .getRawOne();

  // Convertemos para número, pois dependendo do banco o count vem como string
  const total = Number(resultado?.total) || 0;

  return total > 0;
}
async temConfirmacao(numMatricula: number, anoLectivo: number): Promise<boolean> {
  const resultado = await this.dataSource.createQueryBuilder()
    .select("COUNT(TGCA.CODIGO)", "total")
    .from("FK2_TB_GRADE_CURRICULAR_ALUNO", "TGCA")
    .innerJoin("FK2_TB_MATRICULAS", "TM", "TM.CODIGO = TGCA.CODIGO_MATRICULA")
    .where("TGCA.CODIGO_STATUS_GRADE_CURRICULAR IN (:...status)", { status: [2, 3] })
    .andWhere("TGCA.EQUIVALENCIA = :equivalencia", { equivalencia: 0 })
    .andWhere("TGCA.CODIGO_ANO_LECTIVO = :anoLectivo", { anoLectivo })
    .andWhere("TGCA.CODIGO_MATRICULA = :numMatricula", { numMatricula })
    .getRawOne();

  // O resultado do COUNT em queries RAW geralmente vem como string ou number
  const total = Number(resultado?.total) || 0;
  console.log({temConfirmacao: total})
  return total > 0;
}
async seTemIsencaoNoAnoAnterior(numMatricula: number, anoLectivo: number): Promise<number> {
  const resultado = await this.dataSource.createQueryBuilder()
    .select("MAX(MT.PRESTACAO)", "max_prestacao")
    .from("FK2_TB_ISENCOES", "TI")
    .innerJoin("FK2_MES_TEMP", "MT", "MT.ID = TI.MES_TEMP_ID")
    .where("TI.CODIGO_MATRICULA = :numMatricula", { numMatricula })
    .andWhere("TI.CODIGO_ANOLECTIVO = :anoLectivo", { anoLectivo })
    .andWhere("TI.ESTADO_ISENSAO = :estado", { estado: 'Activo' })
    .getRawOne();

  // Convertemos o resultado para número. Se for null/undefined, retorna 0.
  return Number(resultado?.max_prestacao) || 0;
}
private async obterTipoCandidatura(numMatricula: number): Promise<number> {
  const resultado = await this.dataSource.createQueryBuilder()
    // Selecionamos apenas o ID do tipo de candidatura
    .select("TP.CODIGO_TIPO_CANDIDATURA", "tipoId") 
    .from("FK2_TB_MATRICULAS", "TM")
    .innerJoin("FK2_TB_ADMISSAO", "TA", "TA.CODIGO = TM.CODIGO_ALUNO")
    .innerJoin("FK2_TB_PREINSCRICAO", "TP", "TP.CODIGO = TA.PRE_INCRICAO")
    .where("TM.CODIGO = :numMatricula", { numMatricula })
    .getRawOne();

  // Retorna o ID como número, ou 0 se não encontrar
  return resultado ? Number(resultado.tipoId) : 0;
}
}







