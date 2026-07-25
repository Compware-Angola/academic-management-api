import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { DataSource } from 'typeorm';
import { CreatePlanoGradeCurricularEmMassaDto } from "./dto/create-plano-grade-curricular-em-massa.dto";



@Injectable()
export class ConfigurationPlaneService {

    constructor(private readonly dataSource: DataSource) { }

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

        // 1. Verificar se já existe o plano do curso, senão criar
        let codigoPlanoCurso: number;
        try {
            codigoPlanoCurso = await this.getPlanoCurso(codigoCurso, codigoAnoLectivo);
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

        // 2. Verificar quais grades já estão no plano, para evitar duplicidade
        const codigosGrade = itens.map((i) => i.codigoGradeCurricular);

        const existentes = await this.dataSource.query(
            `
      SELECT CODIGO_GRADE_CURRICULAR
      FROM FK2_TB_PLANO_CURRICULAR_GRADE
      WHERE CODIGO_PLANO_CURRICULAR_CURSO = :codigoPlanoCurso
        AND CODIGO_GRADE_CURRICULAR IN (:...codigosGrade)
      `,
            { codigoPlanoCurso, codigosGrade } as any,
        );

        const codigosExistentes = new Set(
            (existentes ?? []).map((r: any) => Number(r.CODIGO_GRADE_CURRICULAR)),
        );

        const itensNovos = itens.filter(
            (i) => !codigosExistentes.has(i.codigoGradeCurricular),
        );
        const itensExistentes = itens.filter((i) =>
            codigosExistentes.has(i.codigoGradeCurricular),
        );

        // 3. Reativar os que já existem no plano (apenas ficam inativos)
        for (const item of itensExistentes) {
            await this.ativegrade(item.codigoGradeCurricular);
        }

        // 4. Inserir em massa os itens novos
        if (itensNovos.length > 0) {
            const values = itensNovos
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

            itensNovos.forEach((item, idx) => {
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

        return {
            message: 'Grades curriculares adicionadas ao plano com sucesso.',
            codigoPlanoCurso,
            totalAdicionadas: itensNovos.length,
            totalReativadas: itensExistentes.length,
        };
    }

    // Método auxiliar — cria o plano do curso caso não exista
    private async criarPlanoCurso(
        codigoCurso: number,
        codigoAnoLectivo: number,
        codigoUtilizador: number,
    ): Promise<number> {
        const result = await this.dataSource.query(
            `
    INSERT INTO FK2_TB_PLANO_CURRICULAR_CURSO
      (CODIGO_CURSO, CODIGO_ANO_LECTIVO, CODIGO_UTILIZADOR, DATA_CADASTRO, STATUS_)
    VALUES
      (:codigoCurso, :codigoAnoLectivo, :codigoUtilizador, SYSDATE, 1)
    RETURNING CODIGO INTO :codigo
    `,
            { codigoCurso, codigoAnoLectivo, codigoUtilizador } as any,
        );

        return Number(result?.[0]?.CODIGO ?? result?.CODIGO);
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