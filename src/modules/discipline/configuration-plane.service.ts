import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreatePlanoGradeCurricularEmMassaDto } from './dto/create-plano-grade-curricular-em-massa.dto';
import oracledb from 'oracledb';

@Injectable()
export class ConfigurationPlaneService {
  constructor(private readonly dataSource: DataSource) {}

  async createConfigurationPlano(
    dto: CreatePlanoGradeCurricularEmMassaDto,
    codigoUtilizador: number,
  ) {
    const { codigoCurso, codigoAnoLectivo, itens } = dto;

    if (!itens || itens.length === 0) {
      throw new BadRequestException(
        'É necessário informar ao menos um item da grade curricular.',
      );
    }

    const adicionados: Array<{ codigoGradeCurricular: number }> = [];
    const duplicados: Array<{
      codigoGradeCurricular: number;
      motivo: string;
    }> = [];
    const erros: Array<{
      codigoGradeCurricular: number | null;
      motivo: string;
    }> = [];

    // 0. Detectar duplicidade dentro do próprio payload
    const vistosNoPayload = new Set<number>();
    const itensUnicos: typeof itens = [];

    for (const item of itens) {
      if (vistosNoPayload.has(item.codigoGradeCurricular)) {
        duplicados.push({
          codigoGradeCurricular: item.codigoGradeCurricular,
          motivo: 'Item duplicado no payload enviado.',
        });
        continue;
      }
      vistosNoPayload.add(item.codigoGradeCurricular);
      itensUnicos.push(item);
    }

    // 1. Verificar se já existe o plano do curso, senão criar
    let codigoPlanoCurso: number;
    try {
      codigoPlanoCurso = await this.getPlanoCurso(
        codigoCurso,
        codigoAnoLectivo,
      );
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
      codigoPlanoCurso = 0;
    }

    if (!codigoPlanoCurso || codigoPlanoCurso < 0) {
      codigoPlanoCurso = await this.criarPlanoCurso(
        codigoCurso,
        codigoAnoLectivo,
        codigoUtilizador,
      );

      if (!codigoPlanoCurso) {
        throw new InternalServerErrorException(
          'Erro ao criar o plano do curso.',
        );
      }
    }

    if (itensUnicos.length === 0) {
      return this.montarResultado(
        codigoPlanoCurso,
        itens.length,
        adicionados,
        duplicados,
        erros,
      );
    }

    // 2. Verificar quais grades curriculares realmente existem
    const codigosGradeUnicos = itensUnicos.map((i) => i.codigoGradeCurricular);
    const codigosValidos =
      await this.filtrarGradesExistentes(codigosGradeUnicos);

    const itensComGradeInvalida = itensUnicos.filter(
      (i) => !codigosValidos.has(i.codigoGradeCurricular),
    );
    itensComGradeInvalida.forEach((item) => {
      erros.push({
        codigoGradeCurricular: item.codigoGradeCurricular,
        motivo: 'Grade curricular não encontrada.',
      });
    });

    const itensComGradeValida = itensUnicos.filter((i) =>
      codigosValidos.has(i.codigoGradeCurricular),
    );

    if (itensComGradeValida.length === 0) {
      return this.montarResultado(
        codigoPlanoCurso,
        itens.length,
        adicionados,
        duplicados,
        erros,
      );
    }

    // 3. Verificar quais grades já estão cadastradas no plano
    const codigosGrade = itensComGradeValida.map(
      (i) => i.codigoGradeCurricular,
    );

    const inPlaceholders = codigosGrade
      .map((_, idx) => `:codigoGrade${idx}`)
      .join(', ');

    const existentesParams: Record<string, any> = { codigoPlanoCurso };
    codigosGrade.forEach((codigo, idx) => {
      existentesParams[`codigoGrade${idx}`] = codigo;
    });

    const existentes = await this.dataSource.query(
      `
      SELECT CODIGO_GRADE_CURRICULAR
      FROM FK2_TB_PLANO_CURRICULAR_GRADE
      WHERE CODIGO_PLANO_CURRICULAR_CURSO = :codigoPlanoCurso
        AND CODIGO_GRADE_CURRICULAR IN (${inPlaceholders})
      `,
      existentesParams as any,
    );
    const codigosJaNoPlano = new Set(
      (existentes ?? []).map((r: any) => Number(r.CODIGO_GRADE_CURRICULAR)),
    );

    const itensNovos = itensComGradeValida.filter(
      (i) => !codigosJaNoPlano.has(i.codigoGradeCurricular),
    );
    const itensParaReativar = itensComGradeValida.filter((i) =>
      codigosJaNoPlano.has(i.codigoGradeCurricular),
    );

    // 4. Reativar os que já existem no plano
    for (const item of itensParaReativar) {
      try {
        await this.ativegrade(item.codigoGradeCurricular);
        duplicados.push({
          codigoGradeCurricular: item.codigoGradeCurricular,
          motivo: 'Já existia no plano — grade reativada.',
        });
      } catch (error) {
        erros.push({
          codigoGradeCurricular: item.codigoGradeCurricular,
          motivo: `Falha ao reativar grade já existente no plano: ${this.mensagemErro(error)}`,
        });
      }
    }

    // 5. Inserir em massa os itens novos; se falhar, refazer item a item
    // para identificar exatamente qual registo causou o problema.
    if (itensNovos.length > 0) {
      try {
        await this.inserirItensEmMassa(
          codigoPlanoCurso,
          codigoUtilizador,
          itensNovos,
        );
        itensNovos.forEach((item) => {
          adicionados.push({
            codigoGradeCurricular: item.codigoGradeCurricular,
          });
        });
      } catch (error) {
        for (const item of itensNovos) {
          try {
            await this.inserirItensEmMassa(codigoPlanoCurso, codigoUtilizador, [
              item,
            ]);
            adicionados.push({
              codigoGradeCurricular: item.codigoGradeCurricular,
            });
          } catch (itemError) {
            erros.push({
              codigoGradeCurricular: item.codigoGradeCurricular,
              motivo: `Falha ao inserir no plano: ${this.mensagemErro(itemError)}`,
            });
          }
        }
      }
    }

    return this.montarResultado(
      codigoPlanoCurso,
      itens.length,
      adicionados,
      duplicados,
      erros,
    );
  }

  // Monta o objeto de resposta padronizado com o resumo da operação em massa
  private montarResultado(
    codigoPlanoCurso: number,
    totalItens: number,
    adicionados: Array<{ codigoGradeCurricular: number }>,
    duplicados: Array<{ codigoGradeCurricular: number; motivo: string }>,
    erros: Array<{ codigoGradeCurricular: number | null; motivo: string }>,
  ) {
    return {
      message:
        erros.length === 0
          ? 'Grades curriculares processadas com sucesso.'
          : 'Grades curriculares processadas com algumas falhas. Verifique o campo "erros".',
      codigoPlanoCurso,
      totalItens,
      totalAdicionadas: adicionados.length,
      totalDuplicadas: duplicados.length,
      totalErros: erros.length,
      adicionados,
      duplicados,
      erros,
    };
  }

  // Extrai uma mensagem legível a partir de um erro do driver Oracle/TypeORM
  private mensagemErro(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Erro desconhecido.';
  }

  // Verifica, dentre os códigos informados, quais grades curriculares realmente existem
  private async filtrarGradesExistentes(
    codigosGrade: number[],
  ): Promise<Set<number>> {
    if (codigosGrade.length === 0) {
      return new Set();
    }

    const inPlaceholders = codigosGrade
      .map((_, idx) => `:codigoGrade${idx}`)
      .join(', ');

    const params: Record<string, any> = {};
    codigosGrade.forEach((codigo, idx) => {
      params[`codigoGrade${idx}`] = codigo;
    });

    const result = await this.dataSource.query(
      `
      SELECT CODIGO
      FROM FK2_TB_GRADE_CURRICULAR
      WHERE CODIGO IN (${inPlaceholders})
      `,
      params as any,
    );

    return new Set((result ?? []).map((r: any) => Number(r.CODIGO)));
  }

  // Insere um ou mais itens na FK2_TB_PLANO_CURRICULAR_GRADE
  private async inserirItensEmMassa(
    codigoPlanoCurso: number,
    codigoUtilizador: number,
    itens: CreatePlanoGradeCurricularEmMassaDto['itens'],
  ) {
    const values = itens
      .map(
        (_, idx) => `(
        :codigoPlanoCurso,
        :codigoGrade${idx},
        SYSDATE,
        :codigoUtilizador,
        :pesoPrimeiraFreq${idx},
        :pesoSegundaFreq${idx},
        :pesoPratica${idx},
        :notaMinPrimeiraFreq${idx},
        :notaMinSegundaFreq${idx},
        :notaMinPratica${idx},
        :codigoUtilizador
      )`,
      )
      .join(', ');

    const params: Record<string, any> = {
      codigoPlanoCurso,
      codigoUtilizador,
    };

    itens.forEach((item, idx) => {
      params[`codigoGrade${idx}`] = item.codigoGradeCurricular;
      params[`pesoPrimeiraFreq${idx}`] = item.pesoPrimeiraFreq;
      params[`pesoSegundaFreq${idx}`] = item.pesoSegundaFreq;
      params[`pesoPratica${idx}`] = item.pesoPratica;
      params[`notaMinPrimeiraFreq${idx}`] = item.notaMinPrimeiraFreq;
      params[`notaMinSegundaFreq${idx}`] = item.notaMinSegundaFreq;
      params[`notaMinPratica${idx}`] = item.notaMinPratica;
    });

    await this.dataSource.query(
      `
      INSERT INTO FK2_TB_PLANO_CURRICULAR_GRADE (
        CODIGO_PLANO_CURRICULAR_CURSO,
        CODIGO_GRADE_CURRICULAR,
        DATA,
        CODIGO_UTILIZADOR,
        PESO_PRIMEIRA_FREQ,
        PESO_SEGUNDA_FREQ,
        PESO_PRATICA,
        NOTA_MIN_PRIMEIRA_FREQ,
        NOTA_MIN_SEGUNDA_FREQ,
        NOTA_MIN_PRATICA,
        UTILIZADOR
      )
      VALUES ${values}
      `,
      params as any,
    );
  }

  // Método auxiliar — cria o plano do curso caso não exista
  private async criarPlanoCurso(
    codigoCurso: number,
    codigoAnoLectivo: number,
    codigoUtilizador: number,
  ): Promise<number> {
    const resultDescription = await this.dataSource.query(
      `
      SELECT
        (SELECT DESIGNACAO FROM FK2_TB_CURSOS WHERE CODIGO = :CODIGOCURSO) AS CURSO,
         (SELECT DESIGNACAO FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :CODIGOANOLECTIVO) AS ANOLECTIVO
      FROM dual
      `,
      { codigoCurso, codigoAnoLectivo } as any,
    );
    const description = `Plano de Estudo do Curso de ${resultDescription?.[0]?.CURSO} ${resultDescription?.[0]?.ANOLECTIVO}`;

    const result = await this.dataSource.query(
      `
    INSERT INTO FK2_TB_PLANO_CURRICULAR_CURSO
      (CODIGO_CURSO,DESIGNACAO, CODIGO_ANO_LECTIVO, CODIGO_UTILIZADOR, DATA )
    VALUES
      (:codigoCurso,:descricao ,:codigoAnoLectivo, :codigoUtilizador, SYSDATE)
    RETURNING CODIGO INTO :codigo
    `,
      {
        codigoCurso,
        descricao: description,
        codigoAnoLectivo,
        codigoUtilizador,

        codigo: {
          dir: oracledb.BIND_OUT,
          type: oracledb.NUMBER,
        },
      } as any,
    );

    return Number(result?.[0]?.codigo ?? result?.codigo);
  }

  private async ativegrade(codigoGrade: number) {
    await this.dataSource.query(
      `
      UPDATE FK2_TB_GRADE_CURRICULAR
      SET STATUS_ = 1
      WHERE CODIGO = :codigoGrade
      `,
      { codigoGrade } as any,
    );
  }

  private async getPlanoCurso(
    codigoCurso: number,
    codigoAnoLectivo: number,
  ): Promise<number> {
    const result = await this.dataSource.query(
      `
    SELECT CODIGO
    FROM FK2_TB_PLANO_CURRICULAR_CURSO
    WHERE CODIGO_CURSO       = :codigoCurso
      AND CODIGO_ANO_LECTIVO = :codigoAnoLectivo
    FETCH FIRST 1 ROWS ONLY
    `,
      { codigoCurso, codigoAnoLectivo } as any,
    );

    if (!result || result.length === 0) {
      throw new NotFoundException(
        `Plano do curso não encontrado para o curso ${codigoCurso} e ano lectivo ${codigoAnoLectivo}.`,
      );
    }

    return Number(result[0].CODIGO);
  }
}
