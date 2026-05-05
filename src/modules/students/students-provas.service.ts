import { BadRequestException, Injectable } from '@nestjs/common';
import { StudentNoteService } from './sudents-notes.service';
import {
  FindCadeirasEpocaEspecialDto,
  FindCadeirasRecursoDto,
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
} from '../common/helpers/finance-invoice.helper';

export const TIPO_AVALIACAO = {
  RECURSO: 7,
  EXAME_ESPECIAL: 11,
} as const;

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

  private filtrarCadeirasElegiveis(
    cadeiras: AvaliacaoItem[],
    opcoes: OpcoesFiltroElegibilidade,
  ): AvaliacaoItem[] {
    return cadeiras.filter((cadeira) => {
      // Regra 1: apenas reprovadas
      if (opcoes.apenasReprovadas && cadeira.resultado !== 'Reprovado') {
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

  private async buscarCadeirasJaInscritas(
    codigoMatricula: number,
    codigoTipoAvaliacao: CodigoTipoAvaliacao,
    codigoGradeAluno: number[],
  ): Promise<number[]> {
    if (!codigoGradeAluno.length) return [];

    const placeholders = codigoGradeAluno.join(', ');

    const sql = `
      SELECT CODIGO_GRADE_ALUNO 
      FROM FK2_TB_HISTORICO_INSCRICOES_AVALIACOES 
      WHERE CODIGO_MATRICULA    = :codigoMatricula 
        AND CODIGO_GRADE_ALUNO  IN (${placeholders})
        AND CODIGO_TIPO_AVALIACAO = :codigoTipoAvaliacao
    `;

    const inscritas = toLowerCaseKeys(
      await this.dataSource.query(sql, [codigoMatricula, codigoTipoAvaliacao]),
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
    codigoGradeAluno: number[],
    codigoTipoAvaliacao: CodigoTipoAvaliacao,
    codigoAnoLectivo: number,
    idFatura: number,
    canal: number,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const gradeId of codigoGradeAluno) {
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
          [codigoMatricula, gradeId, codigoTipoAvaliacao, codigoAnoLectivo],
        );

        if (Number(TOTAL) > 0) {
          throw new BadRequestException(
            `O aluno já está inscrito em uma das cadeiras selecionadas (grade: ${gradeId}).`,
          );
        }

        await queryRunner.query(
          `
          INSERT INTO FK2_TB_HISTORICO_INSCRICOES_AVALIACOES (
            CODIGO_GRADE_ALUNO,
            CODIGO_MATRICULA,
            CODIGO_TIPO_AVALIACAO,
            CODIGO_ANO_LECTIVO,
            CODIGO_FACTURA,
            CANAL,
            ESTADO
          ) VALUES (
            :grade, :matricula, :tipo, :ano, :fatura, :canal, 'pendente'
          )
          `,
          [
            gradeId,
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

  async cadeirasRecurso(dto: FindCadeirasRecursoDto) {
    const { data } = await this.studentNoteService.findAll({
      anoLectivo: dto.anoLectivo,
      codigoMatricula: dto.codigoMatricula,
    });

    const elegiveis = this.filtrarCadeirasElegiveis(data, {
      apenasReprovadas: true,
      excluirComEtapasPosExame: true,
    });

    if (!elegiveis.length) {
      return { total: 0, cadeiras: [] };
    }

    const ids = elegiveis.map((c) => c.codigoGradeAluno);
    const jaInscritas = await this.buscarCadeirasJaInscritas(
      dto.codigoMatricula,
      TIPO_AVALIACAO.RECURSO,
      ids,
    );

    const cadeiras = elegiveis
      .filter((c) => !jaInscritas.includes(c.codigoGradeAluno))
      .map(this.mapearCadeiraBase.bind(this));

    return {
      total: cadeiras.length,
      matricula: dto.codigoMatricula,
      anoLectivo: dto.anoLectivo,
      nomeCompleto: data[0]?.nome_completo ?? null,
      cadeiras,
    };
  }

  async cadeirasEpocaEspecial(dto: FindCadeirasEpocaEspecialDto) {
    const { data } = await this.studentNoteService.findAll({
      anoLectivo: dto.anoLectivo,
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
      anoLectivo: dto.anoLectivo,
      nomeCompleto: elegiveis[0]?.nome_completo ?? null,
      cadeiras: elegiveis.map(this.mapearCadeiraComNotasRecurso.bind(this)),
    };
  }

  async inscricaoRecurso(dto: InscricaoDTO) {
    const [anoLectivo, dadosAluno] = await Promise.all([
      this.buscarAnoLectivoCorrente(),
      this.dadosAluno(dto.codigoMatricula),
    ]);

    const prazo = await this.prazosService.prazoInscricoesRecurso(
      anoLectivo.codigo,
    );
    if (!prazo.podeInscrever) throw new BadRequestException(prazo.mensagem);

    const servico = await this.buscarPrecoServico(
      SIGLA_SERVICO.RECURSO,
      anoLectivo.codigo,
    );
    if (!servico) {
      throw new BadRequestException('Serviço de recurso não configurado.');
    }

    const valores = await this.calcularValoresInscricao(
      dto.codigoGradeAluno.length,
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
      obsItem: 'Inscrição de Recurso',
    });

    const fatura = await FinanceInvoiceHelper.createInvoice(
      this.httpService,
      bodyFatura,
    );

    await this.persistirInscricoes(
      dto.codigoMatricula,
      dto.codigoGradeAluno,
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

    const prazo = await this.prazosService.prazoInscricoesExameEspecial(
      anoLectivo.codigo,
    );
    if (!prazo.podeInscrever) throw new BadRequestException(prazo.mensagem);

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
      dto.codigoGradeAluno.length,
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
      obsItem: 'Inscrição de Época Especial',
    });

    const fatura = await FinanceInvoiceHelper.createInvoice(
      this.httpService,
      bodyFatura,
    );

    await this.persistirInscricoes(
      dto.codigoMatricula,
      dto.codigoGradeAluno,
      TIPO_AVALIACAO.EXAME_ESPECIAL,
      anoLectivo.codigo,
      fatura.Codigo,
      dadosAluno.canal,
    );

    return {
      message: 'Inscrição realizada com sucesso',
    };
  }

  private montarPayloadFatura(ctx: {
    valores: ValoresInscricao;
    servico: ServicoPagamento;
    dto: InscricaoDTO;
    dadosAluno: DadosAluno;
    anoLectivo: AnoLectivo;
    codigoDescricao: number;
    descricao: string;
    obsItem: string;
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

      itens: dto.codigoGradeAluno.map((id) => ({
        CodigoProduto: servico.codigo,
        Quantidade: 1,
        preco: valores.precoBase,
        Total: valores.precoBase,
        valor_pago: 0,
        obs: ctx.obsItem,
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
}
