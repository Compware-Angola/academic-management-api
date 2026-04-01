import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DataSource } from 'typeorm';
import { FindInscricaoSemUCDTO } from './dto/FindInscricaoSemUcDTO';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
@Injectable()
export class RegistrationService {
  constructor(private readonly dataSource: DataSource) {}
  async findInscricaoSemUC(filters: FindInscricaoSemUCDTO) {
    const {
      codigoAnoLectivo,
      codigoCurso,
      grade,
      limit = 10,
      page = 1,
    } = filters;

    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any = {};

    conditions.push(`tm.ESTADO_MATRICULA = 'activo'`);

    conditions.push(`tc.CODIGO = :codigoCurso`);
    params.codigoCurso = codigoCurso;

    conditions.push(`tgca_filter.CODIGO_ANO_LECTIVO = :codigoAnoLectivo`);
    params.codigoAnoLectivo = codigoAnoLectivo;

    conditions.push(`tgca_filter.CODIGO_GRADE_CURRICULAR = :grade`);
    params.grade = grade;

    const whereClause = conditions.join(' AND ');

    const sql = `
    SELECT DISTINCT
        tm.CODIGO                         AS codigo,
        tp.NOME_COMPLETO                 AS nomeCompleto,
        tc.DESIGNACAO                    AS curso
    FROM FK2_TB_MATRICULAS tm
    INNER JOIN FK2_TB_ADMISSAO ta
        ON tm.CODIGO_ALUNO = ta.CODIGO
    INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
    INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO

    -- JOIN opcional caso uses anoCurricular/semestre
    LEFT JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.codigo = :grade

    -- JOIN fake só para reaproveitar filtros no WHERE
    LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca_filter
        ON 1 = 1

    WHERE ${whereClause}
    AND NOT EXISTS (
        SELECT 1
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        INNER JOIN FK2_TB_MATRICULAS tm2
            ON tgca.CODIGO_MATRICULA = tm2.CODIGO
        WHERE
            tm2.CODIGO = tm.CODIGO
            AND tgca.CODIGO_STATUS_GRADE_CURRICULAR = 2
            AND tgca.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
            AND tgca.CODIGO_GRADE_CURRICULAR = :grade
    )
    ORDER BY tm.CODIGO
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;

    const sqlParams = {
      ...params,
      offset,
      limit,
    };

    const sqlCount = `
    SELECT COUNT(DISTINCT tm.CODIGO) AS TOTAL
    FROM FK2_TB_MATRICULAS tm
    INNER JOIN FK2_TB_ADMISSAO ta
        ON tm.CODIGO_ALUNO = ta.CODIGO
    INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
    INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
    LEFT JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.codigo = :grade
    LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca_filter
        ON 1 = 1
    WHERE ${whereClause}
    AND NOT EXISTS (
        SELECT 1
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        INNER JOIN FK2_TB_MATRICULAS tm2
            ON tgca.CODIGO_MATRICULA = tm2.CODIGO
        WHERE
            tm2.CODIGO = tm.CODIGO
            AND tgca.CODIGO_STATUS_GRADE_CURRICULAR = 2
            AND tgca.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
            AND tgca.CODIGO_GRADE_CURRICULAR = :grade
    )
  `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql, sqlParams),
      this.dataSource.query(sqlCount, params),
    ]);

    const total = Number(countResult[0].TOTAL);
    const totalPages = Math.ceil(total / limit);

    return {
      data: await toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages,
    };
  }
}
