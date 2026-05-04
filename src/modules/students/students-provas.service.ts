import { BadRequestException, Injectable } from '@nestjs/common';
import { StudentNoteService } from './sudents-notes.service';
import {
  FindCadeirasEpocaEspecialDto,
  FindCadeirasRecursoDto,
  InscricaoRecursoDTO,
} from './dto/recursos.dto';
import { PrazosService } from '../prazos/prazos.service';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { AvaliacaoItem, ServicoPagamento } from './types';

const CODIGO_TIPO_AVALIACAO_RECURSO = 7;
const SIGLA_SERVICO_RECURSO = 'IaEdRurso';

@Injectable()
export class StudentsProvasService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly studentNoteService: StudentNoteService,
    private readonly prazosService: PrazosService,
  ) {}

  private temNota(valor: string | null | undefined): boolean {
    return valor !== '' && valor !== null && valor !== undefined;
  }

  private jaPassouPorEtapaAposExame(cadeira: AvaliacaoItem): boolean {
    return (
      this.temNota(cadeira.notaRec) || // R   - Recurso
      this.temNota(cadeira.notaOr) || // O   - Prova Oral
      this.temNota(cadeira.notaOrRec) || // OR  - Oral de Recurso
      this.temNota(cadeira.notaEE) || // EE  - Época Especial
      this.temNota(cadeira.notaOEE) || // OEE - Oral Época Especial
      this.temNota(cadeira.notaMel) // M   - Melhoria de Notas
    );
  }

  private mapearCadeira(cadeira: AvaliacaoItem) {
    return {
      codigoGradeAluno: cadeira.codigoGradeAluno,
      gradeCurricula: cadeira.gradeCurricula,
      disciplina: cadeira.disciplina,
      unidadeCurricular: cadeira.unidadeCurricular,
      semestre: cadeira.semestre,
      duracao: cadeira.duracao,
      ano: cadeira.ano,
      media: cadeira.media,
      resultado: cadeira.resultado,
      formula: cadeira.formula,
      obs: cadeira.obs,
      notas: {
        nota1f: cadeira.nota1f || null, // 1ª Frequência
        nota2f: cadeira.nota2f || null, // 2ª Frequência
        notaEx: cadeira.notaEx || null, // Exame
        notaPra: cadeira.notaPra || null, // Prática
      },
    };
  }



  private async anoLectivoCorrente() {
    const anoLectivoSql = `
             SELECT CODIGO, DESIGNACAO
            FROM FK2_TB_ANO_LECTIVO
            WHERE ESTADO = 'Activo'
        `;
    const [anoLectivo] = await this.dataSource.query(anoLectivoSql);
    if (!anoLectivo) {
      throw new BadRequestException('Nenhum ano lectivo corrente encontrado');
    }
    return toLowerCaseKeys(anoLectivo) as {
      codigo: number;
      designacao: string;
    };
  }

  private async cadeirasInscritasNoTipoAvaliacao(
    codigoMatricula: number,
    codigoTipoAvaliacao: number,
    codigoGradeAluno: number[],
  ) {
    const idsCadeiras = codigoGradeAluno.join(', ');

    const sqlInscricoes = `
            SELECT CODIGO_GRADE_ALUNO 
            FROM FK2_TB_HISTORICO_INSCRICOES_AVALIACOES 
            WHERE CODIGO_MATRICULA = :codigoMatricula 
            AND CODIGO_GRADE_ALUNO IN (${idsCadeiras})
            AND CODIGO_TIPO_AVALIACAO = :codigoTipoAvaliacao
        `;

    const inscricoesRealizadas = toLowerCaseKeys(
      await this.dataSource.query(sqlInscricoes, [
        codigoMatricula,
        codigoTipoAvaliacao,
      ]),
    );

    const listaIdsInscritos = inscricoesRealizadas.map(
      (ins) => ins.codigo_grade_aluno,
    );
    return listaIdsInscritos;
  }

  private async buscarPrecoServico(sigla: string, codigoAno: number) {
    const sql = `
    SELECT 
    TS.CODIGO,
    TS.DESCRICAO,
    TS.PRECO,
    TT.TAXA AS TAXA_IVA,
    TS.SIGLA
FROM FK2_TB_TIPO_SERVICOS TS
LEFT JOIN FK2_TIPO_TAXAS TT ON TT.ID = TS.TAXA_IVA_ID
WHERE TS.SIGLA = :sigla 
  AND TS.CODIGO_ANO_LECTIVO = :codigoAno
  AND TS.ESTADO = 'Ativo'
  AND ROWNUM = 1
    `;

    const [servico] = await this.dataSource.query(sql, [sigla, codigoAno]);

    return servico ? (toLowerCaseKeys(servico) as ServicoPagamento) : null;
  }

  private async buscarParametroRetencao(): Promise<number> {
    const sql = `
        SELECT VALOR 
        FROM FK2_TB_PARAMETROS 
        WHERE DESCRICAO = 'PC' 
          AND ESTADO = 1 
          AND ROWNUM = 1
    `;
    const resultado = await this.dataSource.query(sql);
    if (resultado && resultado.length > 0) {
      const valor = toLowerCaseKeys(resultado[0]).valor;
      return Number(valor);
    }
    return 0;
  }

  async calcularValoresInscricao(
    quantidadeCadeiras: number,
    servico: ServicoPagamento,
  ) {
    const percRetencao = await this.buscarParametroRetencao();

    const precoBase = Number(servico.preco);
    const taxaIva = Number(servico.taxa_iva || 0);
    const valorIva = precoBase * (taxaIva / 100);
    const precoComIva = precoBase + valorIva;

    const qtdCadeiras = quantidadeCadeiras;
    const totalIncidencia = precoBase * qtdCadeiras;
    const totalIVA = valorIva * qtdCadeiras;
    const totalPreco = precoComIva * qtdCadeiras;

    const totalRetencao = totalIncidencia * (percRetencao / 100);

    const valorAPagar = totalPreco - totalRetencao;

    return {
      totalIncidencia,
      totalIVA,
      totalRetencao,
      totalPreco,
      valorAPagar,
      precoBase,
      taxaIva,
      valorIva,
      percRetencao,
    };
  }

    async cadeirasRecurso(dto: FindCadeirasRecursoDto) {
    const { data } = await this.studentNoteService.findAll({
      anoLectivo: dto.anoLectivo,
      codigoMatricula: dto.codigoMatricula,
    });

    const cadeirasElegiveis = data.filter((cadeira: AvaliacaoItem) => {
      const reprovado = cadeira.resultado === 'Reprovado';
      const naoPassouEtapasPosExame = !this.jaPassouPorEtapaAposExame(cadeira);
      return reprovado && naoPassouEtapasPosExame;
    });

    if (cadeirasElegiveis.length === 0) {
      return { total: 0, cadeiras: [] };
    }

    const idsCadeiras = cadeirasElegiveis.map((c) => c.codigoGradeAluno);

    const listaIdsInscritos = await this.cadeirasInscritasNoTipoAvaliacao(
      dto.codigoMatricula,
      CODIGO_TIPO_AVALIACAO_RECURSO,
      idsCadeiras,
    );
    const cadeirasParaRecurso = cadeirasElegiveis.filter(
      (c) => !listaIdsInscritos.includes(c.codigoGradeAluno),
    );

    return {
      total: cadeirasParaRecurso.length,
      matricula: dto.codigoMatricula,
      anoLectivo: dto.anoLectivo,
      nomeCompleto: data[0]?.nome_completo ?? null,
      cadeiras: cadeirasParaRecurso.map(this.mapearCadeira.bind(this)),
    };
  }
  async cadeirasEpocaEspecial(dto: FindCadeirasEpocaEspecialDto) {
    const { data } = await this.studentNoteService.findAll({
      anoLectivo: dto.anoLectivo,
      codigoMatricula: dto.codigoMatricula,
    });

    const cadeirasParaEE = data.filter((cadeira: AvaliacaoItem) => {
      const reprovado = cadeira.resultado === 'Reprovado';
      const jaFezEpocaEspecial =
        this.temNota(cadeira.notaEE) || this.temNota(cadeira.notaOEE);
      const foiDiretoSemRecurso =
        !this.temNota(cadeira.notaRec) && !this.temNota(cadeira.notaOrRec);
      const fezRecursoEReprovou =
        this.temNota(cadeira.notaRec) && cadeira.resultado === 'Reprovado';
      const fezOralRecursoEReprovou =
        this.temNota(cadeira.notaOrRec) && cadeira.resultado === 'Reprovado';

      const podeInscreverEE =
        foiDiretoSemRecurso || fezRecursoEReprovou || fezOralRecursoEReprovou;

      return reprovado && !jaFezEpocaEspecial && podeInscreverEE;
    });

    return {
      total: cadeirasParaEE.length,
      matricula: dto.codigoMatricula,
      anoLectivo: dto.anoLectivo,
      nomeCompleto: cadeirasParaEE[0]?.nome_completo ?? null,
      cadeiras: cadeirasParaEE.map((cadeira: AvaliacaoItem) => ({
        ...this.mapearCadeira(cadeira),
        notasRecurso: {
          notaRec: cadeira.notaRec || null,
          notaOrRec: cadeira.notaOrRec || null,
        },
      })),
    };
  }

  async inscricaoRecurso(dto: InscricaoRecursoDTO) {
    const anoLectivo = await this.anoLectivoCorrente();

    const prazo = await this.prazosService.prazoInscricoesRecurso(
      anoLectivo.codigo,
    );
    // if (!prazo.podeInscrever) {
    //   throw new BadRequestException(prazo.mensagem);
    // }

    const servico = await this.buscarPrecoServico(
      SIGLA_SERVICO_RECURSO,
      anoLectivo.codigo,
    );
    if (!servico) {
      throw new BadRequestException('Nenhum serviço encontrado para o recurso');
    }
 const valores = await this.calcularValoresInscricao(dto.codigoGradeAluno.length, servico)
    return {valores};
  }
}
