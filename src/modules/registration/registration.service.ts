import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DataSource } from 'typeorm';
import { FindInscricaoSemUCDTO } from './dto/find-inscricao-sem-ucDTO';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindEstudanteMatriculadoDTO } from './dto/find-studantes-matriculadoDTO';
import { FindEstudantesSemInscricaoCursoDTO } from './dto/find-estudantes-sem-Inscricao-cursoDTO';
import { calcularSemestreByAnoLectivo } from '../util/calcular-semestre';

export interface EstudanteMatriculado {
  codigoMatricula: number;
  dataMatricula: Date;
  nome: string;
  telefone: string;
  genero: string;
  anoLectivo: string;
  tipo: string | undefined;
  curso: string;
  periodo: string;
  classe: string;
}

@Injectable()
export class RegistrationService {
  constructor(private readonly dataSource: DataSource) {}

  async findEstudantesMatriculados(filters: FindEstudanteMatriculadoDTO) {
    const enum TIPO_ESTUDANTE {
      ANTIGO_ESTUDANTE = 0,
      NOVO_ESTUDANTE = 1,
    }
    const {
      codigoAnoLectivo,
      codigoCurso,
      periodo,
      tipoEstudante,
      anoCurricular,
      limit = 10,
      page = 1,
    } = filters;

    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any = {};

    // STATUS fixo
    conditions.push(`g.CODIGO_STATUS_GRADE_CURRICULAR IN (2)`);

    if (codigoAnoLectivo) {
      conditions.push(`g.CODIGO_ANO_LECTIVO = :codigoAnoLectivo`);
      params.codigoAnoLectivo = codigoAnoLectivo;
    }
    if (anoCurricular) {
      conditions.push(`tg.CODIGO_CLASSE = :anoCurricular`);
      params.anoCurricular = anoCurricular;
    }

    if (codigoCurso) {
      conditions.push(`tc.CODIGO = :codigoCurso`);
      params.codigoCurso = codigoCurso;
    }

    if (periodo) {
      conditions.push(`tp2.CODIGO = :periodo`);
      params.periodo = periodo;
    }

    if (tipoEstudante == TIPO_ESTUDANTE.ANTIGO_ESTUDANTE) {
      conditions.push(`tp.ANOLECTIVO != :excludeAnoLectivo`);
      params.excludeAnoLectivo = codigoAnoLectivo;
    }
    if (tipoEstudante == TIPO_ESTUDANTE.NOVO_ESTUDANTE) {
      conditions.push(`tp.ANOLECTIVO = :includeAnoLectivo`);
      params.includeAnoLectivo = codigoAnoLectivo;
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
    SELECT DISTINCT
        g.CODIGO_MATRICULA           AS codigoMatricula,
        tm.DATA_MATRICULA            As dataMatricula,
        tp.NOME_COMPLETO             AS nome,
        tp.CONTACTOS_TELEFONICOS     AS telefone,
        tp.SEXO                      AS genero,
        tal.DESIGNACAO               AS anoLectivo,
        tc.DESIGNACAO                AS curso,
        tp2.DESIGNACAO               AS periodo,
        cl.DESIGNACAO                AS classe,
        fn_tipo_estudante(fb.codigo, i.renuncia, fb.CODIGO_TIPO_BOLSA) as tipo
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO g
    INNER JOIN FK2_TB_GRADE_CURRICULAR tg
        on tg.codigo = g.CODIGO_GRADE_CURRICULAR
    INNER JOIN FK2_TB_MATRICULAS tm
        ON g.CODIGO_MATRICULA = tm.CODIGO
    INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
    INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO tp
        ON ta.PRE_INCRICAO = tp.CODIGO
    INNER JOIN FK2_TB_PERIODOS tp2
        ON tp2.CODIGO = tp.CODIGO_TURNO
    INNER JOIN FK2_TB_ANO_LECTIVO tal
        ON tal.CODIGO = tp.ANOLECTIVO
    INNER JOIN FK2_TB_CLASSES cl
        ON cl.CODIGO = tg.CODIGO_CLASSE

    ---BOLSEIROS [TIPOS DE ESTUDANTES]
     LEFT JOIN fk2_tb_bolseiros fb
        ON  fb.CODIGO_MATRICULA  = tm.CODIGO
        AND fb.CODIGO_ANOLECTIVO = g.CODIGO_ANO_LECTIVO
        AND fb.SEMESTRE          = tg.CODIGO_SEMESTRE
        AND fb.STATUS_           = 0 -- passar parametro depois
    LEFT JOIN FK2_TB_INSTITUICAO i
        ON i.CODIGO = fb.CODIGO_INSTITUICAO
    ----FIM BOLSEIROS [TIPOS DE ESTUDANTES]

    WHERE ${whereClause}
    ORDER BY tp.NOME_COMPLETO ASC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;

    const sqlParams = {
      ...params,
      offset,
      limit,
    };

    const sqlCount = `
    SELECT COUNT(DISTINCT g.CODIGO_MATRICULA) AS TOTAL
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO g
    INNER JOIN FK2_TB_GRADE_CURRICULAR tg
        on tg.codigo = g.CODIGO_GRADE_CURRICULAR
    INNER JOIN FK2_TB_MATRICULAS tm
        ON g.CODIGO_MATRICULA = tm.CODIGO
    INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
    INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO tp
        ON ta.PRE_INCRICAO = tp.CODIGO
    INNER JOIN FK2_TB_PERIODOS tp2
        ON tp2.CODIGO = tp.CODIGO_TURNO
    INNER JOIN FK2_TB_ANO_LECTIVO tal
        ON tal.CODIGO = tp.ANOLECTIVO
    WHERE ${whereClause}
  `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql, sqlParams),
      this.dataSource.query(sqlCount, params),
    ]);
    let students = (await toLowerCaseKeys(result)) as EstudanteMatriculado[];
    students = students.map((student) => {
      return { ...student };
    });

    const total = Number(countResult[0].TOTAL);
    const totalPages = Math.ceil(total / limit);

    return {
      data: students,
      total,
      page,
      limit,
      totalPages,
    };
  }

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
        tc.DESIGNACAO                    AS curso,
        fn_tipo_estudante(fb.codigo, i.renuncia, fb.CODIGO_TIPO_BOLSA) as tipo
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

    ---BOLSEIROS [TIPOS DE ESTUDANTES]
     LEFT JOIN fk2_tb_bolseiros fb
        ON  fb.CODIGO_MATRICULA  = tm.CODIGO
        AND fb.CODIGO_ANOLECTIVO = :codigoAnoLectivo
        AND fb.SEMESTRE          = tgc.CODIGO_SEMESTRE
        AND fb.STATUS_           = 0 -- passar parametro depois
    LEFT JOIN FK2_TB_INSTITUICAO i
        ON i.CODIGO = fb.CODIGO_INSTITUICAO
    ----FIM BOLSEIROS [TIPOS DE ESTUDANTES]

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

  async findEstudantesSemInscricaoCurso(
    filters: FindEstudantesSemInscricaoCursoDTO,
  ) {
    const {
      codigoAnoLectivo,
      codigoCurso,
      limit = 10,
      page = 1,
      codigoMatricula,
      nome,
    } = filters;

    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any = {};
    const semestreCalculado = await calcularSemestreByAnoLectivo(
      this.dataSource,
      codigoAnoLectivo,
    );
    const semestre = semestreCalculado == null ? 2 : semestreCalculado;

    conditions.push(`tm.ESTADO_MATRICULA = 'activo'`);

    conditions.push(`tc.CODIGO = :codigoCurso`);
    params.codigoCurso = codigoCurso;

    if (codigoMatricula) {
      conditions.push(`tm.CODIGO = :codigoMatricula`);
      params.codigoMatricula = codigoMatricula;
    }
    if (nome) {
      conditions.push(
        `fn_remove_acentos(UPPER(tp.NOME_COMPLETO)) LIKE '%' || fn_remove_acentos(UPPER(:nome)) || '%'`,
      );
      params.nome = nome;
    }
    const whereClause = conditions.join(' AND ');

    const sql = `
    SELECT DISTINCT
        tm.CODIGO                         AS codigo,
        tp.NOME_COMPLETO                 AS nomeCompleto,
        tc.DESIGNACAO                    AS curso,
        fn_tipo_estudante(
            fb.codigo,
            i.renuncia,
            fb.CODIGO_TIPO_BOLSA
        ) AS tipo
    FROM FK2_TB_MATRICULAS tm
    INNER JOIN FK2_TB_ADMISSAO ta
        ON tm.CODIGO_ALUNO = ta.CODIGO
    INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
    INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO

    --- BOLSEIROS
    LEFT JOIN FK2_TB_BOLSEIROS fb
        ON fb.CODIGO_MATRICULA  = tm.CODIGO
        AND fb.CODIGO_ANOLECTIVO = :codigoAnoLectivo
        AND fb.SEMESTRE          = :semestre
        AND fb.STATUS_           = :status
    LEFT JOIN FK2_TB_INSTITUICAO i
        ON i.CODIGO = fb.CODIGO_INSTITUICAO

    WHERE ${whereClause}
    AND NOT EXISTS (
        SELECT 1
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        WHERE tgca.CODIGO_MATRICULA = tm.CODIGO
          AND tgca.CODIGO_STATUS_GRADE_CURRICULAR = 2
          AND tgca.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
    )
    ORDER BY tm.CODIGO
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;

    const sqlParams = {
      ...params,
      codigoAnoLectivo,
      semestre,
      status: 0,
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

    WHERE ${whereClause}
    AND NOT EXISTS (
        SELECT 1
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        WHERE tgca.CODIGO_MATRICULA = tm.CODIGO
          AND tgca.CODIGO_STATUS_GRADE_CURRICULAR = 2
          AND tgca.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
    )
  `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql, sqlParams),
      this.dataSource.query(sqlCount, {
        ...params,
        codigoAnoLectivo,
      }),
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
