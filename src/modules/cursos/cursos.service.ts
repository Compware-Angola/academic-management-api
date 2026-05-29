import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

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
}
