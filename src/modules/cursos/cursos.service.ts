import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { CoursesQueryDto } from './dtos/course.dto';
import { buildCursosCountQuery, buildCursosQuery, buildCursosWhereClause } from './query-builder/course.query-builder';

@Injectable()
export class CursosService {
  constructor(private readonly dataSource: DataSource) {}
  async buscarEspecialidadesPorMatricula(codigoMatricula: number) {
    const result = await this.dataSource.query(
      `
    SELECT
        COALESCE(e.CODIGO_CURSO, m.CODIGO_CURSO) AS CODIGO_CURSO
    FROM FK2_TB_MATRICULAS m
    LEFT JOIN FK2_TB_CURSO_ESPECIALIDADE e
        ON m.CODIGO_CURSO = e.CODIGO_CURSO_ESPECIALIDADE
    WHERE m.CODIGO = :1
    `,
      [codigoMatricula],
    );

    const codigoCurso = result[0]?.CODIGO_CURSO;

    const especialidades = await this.dataSource.query(
      `
    SELECT
        c.CODIGO as codigo,
        c.DESIGNACAO as designacao
    FROM FK2_TB_CURSOS c
    INNER JOIN FK2_TB_CURSO_ESPECIALIDADE e
        ON c.CODIGO = e.CODIGO_CURSO_ESPECIALIDADE
    WHERE e.CODIGO_CURSO = :1
    `,
      [codigoCurso],
    );

    return toLowerCaseKeys(especialidades);
  }

  async buscarCursos (filters:CoursesQueryDto) {
    const {limit=10,page=1} = filters;
    const offset = (page-1) * limit;
    const {clauses,params} = buildCursosWhereClause(filters);
    const whereClause = clauses.length > 0 ? clauses.join(' AND ') : '1=1';

    const [rows, countResult] = await Promise.all([
        this.dataSource.query(
        buildCursosQuery(whereClause),
        {
          ...params,
          offset,
          limit,
        } as any,
      ),
      this.dataSource.query(buildCursosCountQuery(whereClause), params as any),
    ]);
    const total = Number(countResult[0]?.TOTAL ?? 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data: toLowerCaseKeys(rows),
      total,
      page,
      limit,
      totalPages,
    };
  }
}
