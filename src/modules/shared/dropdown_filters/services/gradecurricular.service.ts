import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { toLowerCaseKeys } from 'src/modules/util/toLowerCaseKeys';
import { DataSource } from 'typeorm';
import { FindUnidadesCurricularesDTO } from '../dto/find-unidades-curriculares.dto';

@Injectable()
export class GradeCurricularService {
  constructor(private readonly dataSource: DataSource) {}

  async findUnidadesCurriculares({
    curso,
    semestre,
    classe,
    anoLectivo,
  }: FindUnidadesCurricularesDTO) {
    const anoLectivoFiltro =
      anoLectivo && anoLectivo !== 23 ? anoLectivo : null;

    try {
      /**
       * 1. Verificar se o curso é um departamento
       *
       * Departamento:
       * GRAU = 0
       * FACULDADE_ID IS NULL
       */
      let isDepartamento = false;

      if (curso) {
        const [departamento] = await this.dataSource.query(
          `
            SELECT 1
            FROM FK2_TB_CURSOS
            WHERE CODIGO = :curso
              AND GRAU = 0
              AND FACULDADE_ID IS NULL
              AND ROWNUM = 1
          `,
          {
            curso,
          } as any,
        );

        isDepartamento = !!departamento;
      }

      /**
       * 2. Query para Departamento
       *
       * Para departamento, a grade curricular é ligada
       * diretamente ao CODIGO_CURSO da FK2_TB_GRADE_CURRICULAR.
       */
      if (isDepartamento) {
        const sqlDepartamento = `
          SELECT DISTINCT
              gc.CODIGO AS pk,
              d.DESIGNACAO AS descricao,
              d.NOME_ABREVIATURA AS codigo
          FROM FK2_TB_GRADE_CURRICULAR gc

          INNER JOIN FK2_TB_DISCIPLINAS d
              ON gc.CODIGO_DISCIPLINA = d.CODIGO

          WHERE gc.CODIGO_CURSO = :curso
            AND gc.STATUS_ = 1
        `;

        const result = await this.dataSource.query(sqlDepartamento, {
          curso,
        } as any);

        return {
          data: await toLowerCaseKeys(result),
        };
      }

      /**
       * 3. Query para Curso normal
       *
       * Mantém a lógica existente através de:
       * GRADE_CURRICULAR
       *      ↓
       * PLANO_CURRICULAR_GRADE
       *      ↓
       * PLANO_CURRICULAR_CURSO
       */
      const sqlCurso = `
        SELECT DISTINCT
            gc.CODIGO AS pk,
            d.DESIGNACAO AS descricao,
            d.NOME_ABREVIATURA AS codigo
        FROM FK2_TB_GRADE_CURRICULAR gc

        INNER JOIN FK2_TB_DISCIPLINAS d
            ON gc.CODIGO_DISCIPLINA = d.CODIGO

        INNER JOIN FK2_TB_PLANO_CURRICULAR_GRADE pcg
            ON gc.CODIGO = pcg.CODIGO_GRADE_CURRICULAR

        INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO pcc
            ON pcg.CODIGO_PLANO_CURRICULAR_CURSO = pcc.CODIGO

        WHERE 1 = 1

          AND (
            :curso IS NULL
            OR gc.CODIGO_CURSO = :curso
          )

          AND (
            :semestre IS NULL
            OR gc.CODIGO_SEMESTRE = :semestre
          )

          AND (
            :classe IS NULL
            OR gc.CODIGO_CLASSE = :classe
          )

          AND (
            :anoLectivo IS NULL
            OR pcc.CODIGO_ANO_LECTIVO = :anoLectivo
          )

          AND gc.STATUS_ = 1
      `;

      const result = await this.dataSource.query(sqlCurso, {
        curso: curso ?? null,
        semestre: semestre ?? null,
        classe: classe ?? null,
        anoLectivo: anoLectivoFiltro,
      } as any);

      return {
        data: await toLowerCaseKeys(result),
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        'Erro ao listar unidades curriculares: ' + error.message,
      );
    }
  }
}
