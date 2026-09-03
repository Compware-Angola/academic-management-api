import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { Curso, CursoParamsDto } from './dto/curso-params.dto';

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

  async buscarCursoBasePorMatricula(codigoMatricula: number) {
    const result = await this.dataSource.query(
      `
    SELECT
        c.CODIGO     AS codigo,
        c.DESIGNACAO AS designacao
    FROM FK2_TB_MATRICULAS m
    LEFT JOIN FK2_TB_CURSO_ESPECIALIDADE e
        ON m.CODIGO_CURSO = e.CODIGO_CURSO_ESPECIALIDADE
    INNER JOIN FK2_TB_CURSOS c
        ON c.CODIGO = COALESCE(e.CODIGO_CURSO, m.CODIGO_CURSO)
    WHERE m.CODIGO = :1
      AND ROWNUM = 1
    `,
      [codigoMatricula],
    );

    const cursos = toLowerCaseKeys(result);
    return cursos[0] ?? null;
  }

  async getCursosWithVagas(params?: CursoParamsDto): Promise<Curso[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const isGraduacao =
        params?.tipoCandidaturaId !== undefined &&
        Number(params.tipoCandidaturaId) === 1;

      const vagasTable = isGraduacao
        ? 'FK2_VAGAS_CURSOS'
        : 'FK2_VAGAS_CURSOS_POS_GRADUACAO';

      const conditions: string[] = ['VAGA.NUM_VAGAS > 0'];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (params?.faculdadeId) {
        conditions.push(`CURSO.FACULDADE_ID = :${paramIndex}`);
        queryParams.push(Number(params.faculdadeId));
        paramIndex++;
      }

      if (params?.tipoCandidaturaId) {
        conditions.push(`CURSO.TIPO_CANDIDATURA = :${paramIndex}`);
        queryParams.push(Number(params.tipoCandidaturaId));
        paramIndex++;
      }

      if (params?.anoLectivo) {
        conditions.push(`VAGA.ANO_LECTIVO_ID = :${paramIndex}`);
        queryParams.push(Number(params.anoLectivo));
        paramIndex++;
      }

      if (params?.periodo) {
        conditions.push(`VAGA.PERIODO_ID = :${paramIndex}`);
        queryParams.push(Number(params.periodo));
        paramIndex++;
      }

      const sql = `
        SELECT DISTINCT
          CURSO.CODIGO AS "codigo",
          CURSO.DESIGNACAO AS "designacao",
          CURSO.DURACAO AS "duracao"
        FROM FK2_TB_CURSOS CURSO
        INNER JOIN ${vagasTable} VAGA
          ON VAGA.CURSO_ID = CURSO.CODIGO
        WHERE ${conditions.join(' AND ')}
      `;

      const result = await queryRunner.query(sql, queryParams);
      return result as Curso[];
    } finally {
      await queryRunner.release();
    }
  }
}
