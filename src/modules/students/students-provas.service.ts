import { BadRequestException, Injectable } from '@nestjs/common';
import { StudentNoteService } from './sudents-notes.service';
import {
  FindCadeirasEpocaEspecialDto,
  FindCadeirasRecursoDto,
  GradeRecursoAluno,
  InscricaoDTO,
} from './dto/recursos.dto';
import { PrazosService } from '../prazos/prazos.service';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { AvaliacaoItem, ServicoPagamento } from './types';
import { HttpService } from '@nestjs/axios';
import {
  FinanceInvoiceHelper,
  InvoicePayload,
} from '../../common/helpers/finance-invoice.helper';
import { TipoCalendario } from '../prazos/utils/tipo-calendario.enum';
import { StudentsResultPlanService } from './students-result-plan.service';

export const TIPO_AVALIACAO = {
  RECURSO: 7,
  EXAME_ESPECIAL: 11,
} as const;

const SEMESTRE_TODOS = 3;

const SEMESTRE_CODIGO: Record<string, number> = {
  'I SEMESTRE': 1,
  'II SEMESTRE': 2,
};

const SIGLA_TIPO_PRAZO_LANCAMENTO_NOTAS = 'LN';
const SIGLA_1F = '1F';
const SIGLA_2F = '2F';

// Adicionar aos teus enums/constantes existentes (perto de TIPO_AVALIACAO)
// const TIPO_PRAZO_LANCAMENTO = {
//   LANCAR_1F: 14, // L.1F - Lançar nota da 1ª Frequência
//   LANCAR_2F: 15, // L.2F - Lançar nota da 2ª Frequência
// } as const;

type SituacaoPrazo = 'ANTES' | 'DURANTE' | 'DEPOIS' | 'NAO_CONFIGURADO';

interface PrazosLancamentoSemestre {
  situacao1F: SituacaoPrazo;
  situacao2F: SituacaoPrazo;
}

export type CodigoTipoAvaliacao =
  (typeof TIPO_AVALIACAO)[keyof typeof TIPO_AVALIACAO];

export const SIGLA_SERVICO = {
  RECURSO: 'IaEdRurso',
  EXAME_ESPECIAL: 'IeEEF',
} as const;

interface AnoLectivo {
  codigo: number;
  designacao: string;
}

interface DadosAluno {
  codigo_preinscricao: number;
  polo_id: number;
  canal: number;
}

interface ValoresInscricao {
  totalIncidencia: number;
  totalIVA: number;
  totalRetencao: number;
  totalPreco: number;
  valorAPagar: number;
  precoBase: number;
  taxaIva: number;
  valorIva: number;
  percRetencao: number;
}

interface OpcoesFiltroElegibilidade {
  apenasReprovadas?: boolean;
  excluirComEtapasPosExame?: boolean;
  excluirSeTemNotas?: (keyof AvaliacaoItem)[];
  requererAoMenosUmaCondicao?: Array<(cadeira: AvaliacaoItem) => boolean>;
}

@Injectable()
export class StudentsProvasService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly studentNoteService: StudentNoteService,
    private readonly prazosService: PrazosService,
    private readonly httpService: HttpService,
    private readonly studentsResultPlanService: StudentsResultPlanService,
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

  private async buscarSituacaoPrazosLancamento(
    codigoAnoLectivo: number,
    semestresDesignacao: string[],
  ): Promise<Map<string, PrazosLancamentoSemestre>> {
    const mapa = new Map<string, PrazosLancamentoSemestre>();
    if (!semestresDesignacao.length) return mapa;

    const codigosPorDesignacao = new Map<string, number>();
    for (const designacao of semestresDesignacao) {
      const codigo = SEMESTRE_CODIGO[designacao];
      if (codigo !== undefined) codigosPorDesignacao.set(designacao, codigo);
    }

    if (!codigosPorDesignacao.size) return mapa;

    const codigosBusca = [
      ...new Set([...codigosPorDesignacao.values(), SEMESTRE_TODOS]),
    ];

    const placeholdersSemestre = codigosBusca
      .map((_, i) => `:sem${i}`)
      .join(', ');

    const sql = `
    SELECT
      pz.FK_SEMESTRE,
      ta.SIGLA AS SIGLA_AVALIACAO,
      CASE
        WHEN TRUNC(SYSDATE) < TRUNC(pz.DATA_INICIO) THEN 'ANTES'
        WHEN TRUNC(SYSDATE) > TRUNC(pz.DATA_FIM) THEN 'DEPOIS'
        WHEN TRUNC(SYSDATE) BETWEEN TRUNC(pz.DATA_INICIO) AND TRUNC(pz.DATA_FIM) THEN 'DURANTE'
        ELSE 'DESCONHECIDO'
      END AS SITUACAO
    FROM FK2_MCAL_TB_PRAZO pz
    INNER JOIN FK2_MCAL_TB_TIPO_PRAZO tpz
      ON tpz.PK_TIPO_PRAZO = pz.FK_TIPO_PRAZO
    INNER JOIN FK2_MCAL_TB_TIPO_AVALIACAO ta
      ON ta.PK_TIPO_AVALIACAO = pz.FK_TIPO_AVALIACAO
    WHERE tpz.SIGLA = :siglaTipoPrazo
      AND ta.SIGLA IN (:sigla1F, :sigla2F)
      AND pz.FK_ANO_LECTIVO = :anoLectivo
      AND pz.FK_SEMESTRE IN (${placeholdersSemestre})
      AND NVL(pz.ACTIVE_STATE, 1) != 0
  `;

    const params = [
      SIGLA_TIPO_PRAZO_LANCAMENTO_NOTAS,
      SIGLA_1F,
      SIGLA_2F,
      String(codigoAnoLectivo),
      ...codigosBusca,
    ];

    const rows = toLowerCaseKeys(await this.dataSource.query(sql, params));

    const prioridade: Record<SituacaoPrazo, number> = {
      DURANTE: 1,
      ANTES: 2,
      DEPOIS: 3,
      NAO_CONFIGURADO: 4,
    };

    const obterSituacao = (linhas: any[], sigla: string): SituacaoPrazo => {
      const linhasSigla = linhas.filter((r) => r.sigla_avaliacao === sigla);
      if (!linhasSigla.length) return 'NAO_CONFIGURADO';

      return linhasSigla.sort(
        (a, b) => prioridade[a.situacao] - prioridade[b.situacao],
      )[0].situacao;
    };

    for (const [designacao, codigo] of codigosPorDesignacao) {
      const linhasSemestre = rows.filter(
        (r) => r.fk_semestre === codigo || r.fk_semestre === SEMESTRE_TODOS,
      );

      mapa.set(designacao, {
        situacao1F: obterSituacao(linhasSemestre, SIGLA_1F),
        situacao2F: obterSituacao(linhasSemestre, SIGLA_2F),
      });
    }

    return mapa;
  }
  private prazoNotasPendentesEncerrado(
    cadeira: AvaliacaoItem,
    prazosPorSemestre: Map<string, PrazosLancamentoSemestre>,
  ): boolean {
    const prazos = prazosPorSemestre.get(cadeira.semestre);

    // sem prazo configurado para o semestre inteiro = não bloqueia
    if (!prazos) return true;

    const situacoesPendentes: SituacaoPrazo[] = [];

    if (!this.temNota(cadeira.nota1f)) {
      situacoesPendentes.push(prazos.situacao1F);
    }
    if (!this.temNota(cadeira.nota2f)) {
      situacoesPendentes.push(prazos.situacao2F);
    }

    // ambas as notas já lançadas -> não há o que esperar
    if (!situacoesPendentes.length) return true;

    // todas as notas pendentes precisam ter o prazo encerrado ou não configurado
    return situacoesPendentes.every(
      (situacao) => situacao === 'DEPOIS' || situacao === 'NAO_CONFIGURADO',
    );
  }

  private filtrarCadeirasElegiveis(
    cadeiras: AvaliacaoItem[],
    opcoes: OpcoesFiltroElegibilidade,
    prazosPorSemestre?: Map<string, PrazosLancamentoSemestre>,
  ): AvaliacaoItem[] {
    return cadeiras.filter((cadeira) => {
      // Regra 1: apenas reprovadas
      if (opcoes.apenasReprovadas && cadeira.resultado === 'Aprovado') {
        return false;
      }

      // Regra 2: excluir se já passou por etapa pós-exame
      if (
        opcoes.excluirComEtapasPosExame &&
        this.jaPassouPorEtapaAposExame(cadeira)
      ) {
        return false;
      }

      // Regra 3: excluir se tem alguma das notas especificadas
      if (opcoes.excluirSeTemNotas?.length) {
        const temAlgumaNotaExcludente = opcoes.excluirSeTemNotas.some((campo) =>
          this.temNota(cadeira[campo] as string),
        );
        if (temAlgumaNotaExcludente) return false;
      }

      // Regra 4: ao menos uma condição deve ser verdadeira
      if (opcoes.requererAoMenosUmaCondicao?.length) {
        const satisfazCondicao = opcoes.requererAoMenosUmaCondicao.some(
          (condicao) => condicao(cadeira),
        );
        if (!satisfazCondicao) return false;
      }

      // Regra 5: se falta lançar 1F ou 2F, o prazo de lançamento
      // dessa nota tem de já ter passado (ou não estar configurado).
      // Só se aplica quando o mapa de prazos é fornecido (fluxo de recurso).
      if (
        prazosPorSemestre &&
        !this.prazoNotasPendentesEncerrado(cadeira, prazosPorSemestre)
      ) {
        return false;
      }

      return true;
    });
  }

  private mapearCadeiraBase(cadeira: AvaliacaoItem) {
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
        nota1f: cadeira.nota1f || null,
        nota2f: cadeira.nota2f || null,
        notaEx: cadeira.notaEx || null,
        notaPra: cadeira.notaPra || null,
      },
    };
  }

  private mapearCadeiraComNotasRecurso(cadeira: AvaliacaoItem) {
    return {
      ...this.mapearCadeiraBase(cadeira),
      notasRecurso: {
        notaRec: cadeira.notaRec || null,
        notaOrRec: cadeira.notaOrRec || null,
      },
    };
  }

  private async buscarAnoLectivoCorrente(): Promise<AnoLectivo> {
    const sql = `
      SELECT CODIGO, DESIGNACAO
      FROM FK2_TB_ANO_LECTIVO
      WHERE ESTADO = 'Activo'
        AND ROWNUM = 1
    `;
    const [anoLectivo] = await this.dataSource.query(sql);
    if (!anoLectivo) {
      throw new BadRequestException('Nenhum ano lectivo corrente encontrado');
    }
    return toLowerCaseKeys(anoLectivo) as AnoLectivo;
  }

  private async buscarCadeiraInscrita(
    codigoMatricula: number,
    codigoAnoLectivo: number,
    codigoTipoAvaliacao: CodigoTipoAvaliacao,
  ) {
    const sql = `
    SELECT  
      hia.CODIGO_GRADE_ALUNO,
      s.DESIGNACAO              AS semestre,
      d.DESIGNACAO              AS disciplina,
      d.CODIGO                  AS codigo_disciplina,
      hia.CODIGO_GRADE,
      c.DESIGNACAO              AS classe
    FROM FK2_TB_HISTORICO_INSCRICOES_AVALIACOES hia
    INNER JOIN FK2_TB_GRADE_CURRICULAR gc 
      ON gc.CODIGO = hia.CODIGO_GRADE
    INNER JOIN FK2_TB_SEMESTRES s 
      ON s.CODIGO = gc.CODIGO_SEMESTRE
    INNER JOIN FK2_TB_DISCIPLINAS d 
      ON d.CODIGO = gc.CODIGO_DISCIPLINA
    INNER JOIN FK2_TB_CLASSES c 
      ON c.CODIGO = gc.CODIGO_CLASSE
    WHERE hia.CODIGO_MATRICULA = :codigoMatricula
      AND hia.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
      AND hia.CODIGO_TIPO_AVALIACAO = :codigoTipoAvaliacao
  `;

    const result = await this.dataSource.query(sql, [
      codigoMatricula,
      codigoAnoLectivo,
      codigoTipoAvaliacao,
    ]);

    return toLowerCaseKeys(result);
  }

  private async buscarCadeirasJaInscritas(
    codigoMatricula: number,
    codigoTipoAvaliacao: CodigoTipoAvaliacao,
    codigoGradeAluno: number[],
    codigoAnoLectivo: number,
  ): Promise<number[]> {
    if (!codigoGradeAluno.length) return [];

    const placeholders = codigoGradeAluno.join(', ');

    const sql = `
      SELECT CODIGO_GRADE_ALUNO 
      FROM FK2_TB_HISTORICO_INSCRICOES_AVALIACOES 
      WHERE CODIGO_MATRICULA    = :codigoMatricula 
        AND CODIGO_GRADE_ALUNO  IN (${placeholders})
        AND CODIGO_TIPO_AVALIACAO = :codigoTipoAvaliacao
        AND CODIGO_ANO_LECTIVO  = :codigoAnoLectivo
    `;

    const inscritas = toLowerCaseKeys(
      await this.dataSource.query(sql, [
        codigoMatricula,
        codigoTipoAvaliacao,
        codigoAnoLectivo,
      ]),
    );

    return inscritas.map((ins) => ins.codigo_grade_aluno) as number[];
  }

  private async buscarPrecoServico(
    sigla: string,
    codigoAno: number,
  ): Promise<ServicoPagamento | null> {
    const sql = `
      SELECT 
        TS.CODIGO,
        TS.DESCRICAO,
        TS.PRECO,
        TT.TAXA AS TAXA_IVA,
        TS.SIGLA
      FROM FK2_TB_TIPO_SERVICOS TS
      LEFT JOIN FK2_TIPO_TAXAS TT ON TT.ID = TS.TAXA_IVA_ID
      WHERE TS.SIGLA              = :sigla 
        AND TS.CODIGO_ANO_LECTIVO = :codigoAno
        AND TS.ESTADO             = 'Ativo'
        AND ROWNUM                = 1
    `;

    const [servico] = await this.dataSource.query(sql, [sigla, codigoAno]);
    return servico ? (toLowerCaseKeys(servico) as ServicoPagamento) : null;
  }

  private async buscarParametroRetencao(): Promise<number> {
    const sql = `
      SELECT VALOR 
      FROM FK2_TB_PARAMETROS 
      WHERE DESCRICAO = 'PC' 
        AND ESTADO    = 1 
        AND ROWNUM    = 1
    `;
    const resultado = await this.dataSource.query(sql);
    if (resultado?.length) {
      return Number(toLowerCaseKeys(resultado[0]).valor);
    }
    return 0;
  }

  private async calcularValoresInscricao(
    quantidadeCadeiras: number,
    servico: ServicoPagamento,
  ): Promise<ValoresInscricao> {
    const percRetencao = await this.buscarParametroRetencao();

    const precoBase = Number(servico.preco);
    const taxaIva = Number(servico.taxa_iva ?? 0);
    const valorIva = precoBase * (taxaIva / 100);
    const precoComIva = precoBase + valorIva;

    const totalIncidencia = precoBase * quantidadeCadeiras;
    const totalIVA = valorIva * quantidadeCadeiras;
    const totalPreco = precoComIva * quantidadeCadeiras;
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

  private async persistirInscricoes(
    codigoMatricula: number,
    gradeAlunos: GradeRecursoAluno[],
    codigoTipoAvaliacao: CodigoTipoAvaliacao,
    codigoAnoLectivo: number,
    idFatura: number,
    canal: number,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const { codigoGrade, codigoGradeAluno } of gradeAlunos) {
        // Verificação de duplicidade antes de inserir
        const [{ TOTAL }] = await queryRunner.query(
          `
          SELECT COUNT(*) AS TOTAL 
          FROM FK2_TB_HISTORICO_INSCRICOES_AVALIACOES 
          WHERE CODIGO_MATRICULA    = :matricula 
            AND CODIGO_GRADE_ALUNO  = :grade 
            AND CODIGO_TIPO_AVALIACAO = :tipo
            AND CODIGO_ANO_LECTIVO  = :ano
          `,
          [
            codigoMatricula,
            codigoGradeAluno,
            codigoTipoAvaliacao,
            codigoAnoLectivo,
          ],
        );

        if (Number(TOTAL) > 0) {
          throw new BadRequestException(
            `O aluno já está inscrito em uma das cadeiras selecionadas (grade: ${codigoGradeAluno}).`,
          );
        }

        await queryRunner.query(
          `
          INSERT INTO FK2_TB_HISTORICO_INSCRICOES_AVALIACOES (
            CODIGO_GRADE,
            CODIGO_GRADE_ALUNO,
            CODIGO_MATRICULA,
            CODIGO_TIPO_AVALIACAO,
            CODIGO_ANO_LECTIVO,
            CODIGO_FACTURA,
            CANAL,
            ESTADO
          ) VALUES (
            :grade, :gradeAluno, :matricula, :tipo, :ano, :fatura, :canal, 'pendente'
          )
          `,
          [
            codigoGrade,
            codigoGradeAluno,
            codigoMatricula,
            codigoTipoAvaliacao,
            codigoAnoLectivo,
            idFatura,
            canal,
          ],
        );
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async dadosAluno(codigoMatricula: number): Promise<DadosAluno> {
    const sql = `
      SELECT 
        ad.PRE_INCRICAO AS codigo_preinscricao,
        ad.POLO_ID,
        ad.CANAL
      FROM FK2_TB_MATRICULAS m
      INNER JOIN FK2_TB_ADMISSAO ad ON ad.CODIGO = m.CODIGO_ALUNO
      WHERE m.CODIGO = :codigo_matricula
    `;

    const [aluno] = await this.dataSource.query(sql, [codigoMatricula]);
    if (!aluno) {
      throw new BadRequestException('Aluno não encontrado');
    }

    return toLowerCaseKeys(aluno) as DadosAluno;
  }

  private montarPayloadFatura(ctx: {
    valores: ValoresInscricao;
    servico: ServicoPagamento;
    dto: InscricaoDTO;
    dadosAluno: DadosAluno;
    anoLectivo: AnoLectivo;
    codigoDescricao: number;
    descricao: string;
  }): InvoicePayload {
    const { valores, servico, dto, dadosAluno, anoLectivo } = ctx;

    return {
      DataFactura: new Date(),
      TotalPreco: valores.totalPreco,
      totalIVA: valores.totalIVA,
      total_incidencia: valores.totalIncidencia,
      total_retencao: valores.totalRetencao,
      ValorAPagar: valores.valorAPagar,
      CodigoMatricula: dto.codigoMatricula,
      codigo_descricao: ctx.codigoDescricao,
      tipo_documento_factura_id: 2,
      canal: dadosAluno.canal,
      codigo_anoLectivo: anoLectivo.codigo,
      codigo_preinscricao: dadosAluno.codigo_preinscricao,
      Desconto: 0,
      polo_id: dadosAluno.polo_id,
      Descricao: ctx.descricao,
      TotalMulta: 0,

      itens: dto.gradesAlunos.map((grade) => ({
        CodigoProduto: servico.codigo,
        Quantidade: 1,
        preco: valores.precoBase,
        Total: valores.precoBase,
        valor_pago: 0,
        obs: `Inscrição de Recurso - ${grade.unidadeCurricular}`,
        taxaIva: valores.taxaIva,
        valorIva: valores.valorIva,
        retencao: valores.percRetencao,
        incidencia: valores.totalIncidencia,
        valorDesconto: 0,
        descontoProduto: 0,
        mes: '',
        multa: 0,
        estado: 0,
        valorPago: 0,
        valorATransportar: 0,
        codigo_anoLectivo: anoLectivo.codigo,
      })),
    };
  }

  async cadeirasRecurso(dto: FindCadeirasRecursoDto) {
    const { data } = await this.studentNoteService.findAll({
      anoLectivo: dto.codigoAnoLectivo,
      codigoMatricula: dto.codigoMatricula,
    });

    const semestres = [...new Set(data.map((c) => c.semestre))];
    console.log('Semestres', semestres);

    const prazosPorSemestre = await this.buscarSituacaoPrazosLancamento(
      dto.codigoAnoLectivo,
      semestres,
    );
    console.log('Prazos', prazosPorSemestre);

    const elegiveis = this.filtrarCadeirasElegiveis(
      data,
      {
        apenasReprovadas: true,
        excluirComEtapasPosExame: true,
      },
      prazosPorSemestre,
    );

    if (!elegiveis.length) {
      return { total: 0, cadeiras: [] };
    }

    const ids = elegiveis.map((c) => c.codigoGradeAluno);
    const jaInscritas = await this.buscarCadeirasJaInscritas(
      dto.codigoMatricula,
      TIPO_AVALIACAO.RECURSO,
      ids,
      dto.codigoAnoLectivo,
    );

    const cadeiras = elegiveis
      .filter((c) => !jaInscritas.includes(c.codigoGradeAluno))
      .map(this.mapearCadeiraBase.bind(this));

    return {
      total: cadeiras.length,
      matricula: dto.codigoMatricula,
      anoLectivo: dto.codigoAnoLectivo,
      nomeCompleto: data[0]?.nome_completo ?? null,
      cadeiras,
    };
  }

  async cadeirasEpocaEspecial(dto: FindCadeirasEpocaEspecialDto) {
    const { data } = await this.studentNoteService.findAll({
      anoLectivo: dto.codigoAnoLectivo,
      codigoMatricula: dto.codigoMatricula,
    });

    const elegiveis = this.filtrarCadeirasElegiveis(data, {
      apenasReprovadas: true,
      excluirSeTemNotas: ['notaEE', 'notaOEE'],
      requererAoMenosUmaCondicao: [
        // Caminho 1: foi direto para EE, sem passar pelo recurso
        (c) => !this.temNota(c.notaRec) && !this.temNota(c.notaOrRec),
        // Caminho 2: fez recurso e reprovou
        (c) => this.temNota(c.notaRec) && c.resultado === 'Reprovado',
        // Caminho 3: fez oral de recurso e reprovou
        (c) => this.temNota(c.notaOrRec) && c.resultado === 'Reprovado',
      ],
    });

    return {
      total: elegiveis.length,
      matricula: dto.codigoMatricula,
      anoLectivo: dto.codigoAnoLectivo,
      nomeCompleto: elegiveis[0]?.nome_completo ?? null,
      cadeiras: elegiveis.map(this.mapearCadeiraComNotasRecurso.bind(this)),
    };
  }

  async inscricaoRecurso(dto: InscricaoDTO) {
    const [anoLectivo, dadosAluno] = await Promise.all([
      this.buscarAnoLectivoCorrente(),
      this.dadosAluno(dto.codigoMatricula),
    ]);

    const prazo = await this.prazosService.obterPrazo({
      tipo: TipoCalendario.RECURSO,
      anoLectivoParam: anoLectivo.codigo,
    });
    if (prazo && !prazo.podeInscrever)
      throw new BadRequestException(prazo.mensagem);

    const servico = await this.buscarPrecoServico(
      SIGLA_SERVICO.RECURSO,
      anoLectivo.codigo,
    );
    if (!servico) {
      throw new BadRequestException('Serviço de recurso não configurado.');
    }

    const valores = await this.calcularValoresInscricao(
      dto.gradesAlunos.length,
      servico,
    );

    const bodyFatura: InvoicePayload = this.montarPayloadFatura({
      valores,
      servico,
      dto,
      dadosAluno,
      anoLectivo,
      codigoDescricao: 6,
      descricao: `Inscrição de Recurso - ${anoLectivo.designacao}`,
    });

    const fatura = await FinanceInvoiceHelper.createInvoice(
      this.httpService,
      bodyFatura,
    );

    await this.persistirInscricoes(
      dto.codigoMatricula,
      dto.gradesAlunos,
      TIPO_AVALIACAO.RECURSO,
      anoLectivo.codigo,
      fatura.Codigo,
      dadosAluno.canal,
    );

    return {
      message: 'Inscrição realizada com sucesso',
    };
  }

  async inscricaoEpocaEspecial(dto: InscricaoDTO) {
    const [anoLectivo, dadosAluno] = await Promise.all([
      this.buscarAnoLectivoCorrente(),
      this.dadosAluno(dto.codigoMatricula),
    ]);

    const studentForEpocaEspecial =
      await this.studentsResultPlanService.findPlan(dto.codigoMatricula);

    const prazo = await this.prazosService.obterPrazo({
      tipo: TipoCalendario.EXAME_ESPECIAL,
      anoLectivoParam: anoLectivo.codigo,
    });
    if (prazo && !prazo.podeInscrever)
      throw new BadRequestException(prazo.mensagem);

    if (
      !(
        studentForEpocaEspecial.totalGradesCurso -
          studentForEpocaEspecial.totalGrasesAluno <=
        4
      )
    )
      throw new BadRequestException(
        'O aluno não é elegível para inscrição em época especial.',
      );

    const servico = await this.buscarPrecoServico(
      SIGLA_SERVICO.EXAME_ESPECIAL,
      anoLectivo.codigo,
    );
    if (!servico) {
      throw new BadRequestException(
        'Serviço de época especial não configurado.',
      );
    }

    const valores = await this.calcularValoresInscricao(
      dto.gradesAlunos.length,
      servico,
    );

    const bodyFatura: InvoicePayload = this.montarPayloadFatura({
      valores,
      servico,
      dto,
      dadosAluno,
      anoLectivo,
      codigoDescricao: 7,
      descricao: `Inscrição de Época Especial - ${anoLectivo.designacao}`,
    });

    const fatura = await FinanceInvoiceHelper.createInvoice(
      this.httpService,
      bodyFatura,
    );

    await this.persistirInscricoes(
      dto.codigoMatricula,
      dto.gradesAlunos,
      TIPO_AVALIACAO.EXAME_ESPECIAL,
      anoLectivo.codigo,
      fatura.Codigo,
      dadosAluno.canal,
    );

    return {
      message: 'Inscrição realizada com sucesso',
    };
  }

  async recursoCadeiraInscrita({
    codigoMatricula,
    codigoAnoLectivo,
  }: {
    codigoMatricula: number;
    codigoAnoLectivo: number;
  }) {
    const cadeirasInscritas = await this.buscarCadeiraInscrita(
      codigoMatricula,
      codigoAnoLectivo,
      TIPO_AVALIACAO.RECURSO,
    );

    return { cadeirasInscritas };
  }

  async epocaEspecialCadeiraInscrita({
    codigoMatricula,
    codigoAnoLectivo,
  }: {
    codigoMatricula: number;
    codigoAnoLectivo: number;
  }) {
    const cadeirasInscritas = await this.buscarCadeiraInscrita(
      codigoMatricula,
      codigoAnoLectivo,
      TIPO_AVALIACAO.EXAME_ESPECIAL,
    );

    return { cadeirasInscritas };
  }
}
