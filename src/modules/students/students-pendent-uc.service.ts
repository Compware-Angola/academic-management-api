import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FindPendentUCDTO } from './dto/find-pendent-uc.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

@Injectable()
export class StudentsEnrollmentPendentUCService {
  constructor(private readonly dataSource: DataSource) {}
  async findPendent(dto: FindPendentUCDTO) {
    const { codigoMatricula, page = 1, limit = 25 } = dto;

    const sqlCurso = `
    SELECT CODIGO_CURSO
    FROM FK2_TB_MATRICULAS
    WHERE CODIGO = :codigoMatricula
  `;

    const resultadoCurso = await this.dataSource.query(sqlCurso, {
      codigoMatricula,
    } as any);

    if (!resultadoCurso || resultadoCurso.length === 0) {
      throw new BadRequestException('Curso não encontrado');
    }

    const curso = resultadoCurso[0]?.CODIGO_CURSO;

    const offset = (page - 1) * limit;
    const realLimit = limit + 1;

    const sql = `
    SELECT *
    FROM (
      SELECT DISTINCT
        ds.CODIGO_DISCIPLINA  AS codigo_disciplina,
        gc.CODIGO             AS codigo_grade,
        ds.DESIGNACAO         AS disciplina,
        cl.DESIGNACAO         AS classe,
        se.DESIGNACAO         AS semestre,
        du.DESIGNACAO         AS duracao,
        CASE
          WHEN gc.FK_DEPARTAMENTO IS NULL THEN 'Departamento'
          ELSE 'Plano de Estudo'
        END AS tipo
      FROM FK2_TB_GRADE_CURRICULAR gc
      INNER JOIN FK2_TB_DISCIPLINAS ds
        ON ds.codigo = gc.CODIGO_DISCIPLINA
      INNER JOIN FK2_TB_CLASSES cl
        ON cl.codigo = gc.CODIGO_CLASSE
      INNER JOIN FK2_TB_CURSOS cu
        ON cu.codigo = gc.CODIGO_CURSO
      INNER JOIN FK2_TB_DURACAO du
        ON du.codigo = ds.DURACAO
      INNER JOIN FK2_TB_SEMESTRES se
        ON se.codigo = gc.CODIGO_SEMESTRE
      INNER JOIN FK2_TB_PLANO_CURRICULAR_GRADE pg
        ON pg.CODIGO_GRADE_CURRICULAR = gc.codigo
      INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO pc
        ON pc.CODIGO = pg.CODIGO_PLANO_CURRICULAR_CURSO
      WHERE
        gc.STATUS_ = 1
        AND gc.CODIGO_CURSO = :curso
        AND NOT EXISTS (
          SELECT 1
          FROM FK2_TB_GRADE_CURRICULAR_ALUNO gca_aprovado
          INNER JOIN FK2_TB_GRADE_CURRICULAR gc_aprovado
            ON gca_aprovado.CODIGO_GRADE_CURRICULAR = gc_aprovado.CODIGO
          INNER JOIN FK2_TB_DISCIPLINAS ds_aprovado
            ON ds_aprovado.codigo = gc_aprovado.CODIGO_DISCIPLINA
          WHERE
            gca_aprovado.CODIGO_MATRICULA = :codigoMatricula
            AND (
              gc_aprovado.CODIGO_DISCIPLINA = gc.CODIGO_DISCIPLINA OR
              UPPER(TRIM(ds_aprovado.DESIGNACAO)) = UPPER(TRIM(ds.DESIGNACAO)) OR
              UPPER(TRIM(ds_aprovado.NOME_ABREVIATURA)) = UPPER(TRIM(ds.NOME_ABREVIATURA))
            )
            AND (
              gca_aprovado.CODIGO_STATUS_GRADE_CURRICULAR IN (2,3)
              OR (gca_aprovado.NOTA >= 10 AND gca_aprovado.CODIGO_STATUS_GRADE_CURRICULAR <> 5)
            )
        )
    ) t
    ORDER BY t.classe ASC
    OFFSET ${offset} ROWS FETCH NEXT ${realLimit} ROWS ONLY
  `;

    const rows = await this.dataSource.query(sql, {
      curso,
      codigoMatricula,
    } as any);

    const hasNextPage = rows.length > limit;

    if (hasNextPage) {
      rows.pop();
    }

    return {
      data: await toLowerCaseKeys(rows),
      page,
      limit,
      hasNextPage,
    };
  }
}
