import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DataSource } from 'typeorm';
import { FindInscricaoSemUCDTO } from './dto/find-inscricao-sem-ucDTO';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FilterListagemGeralEstudantesDto } from './dto/filter-listagem-geral-de-estudantes.dto';
import { FilterInscritosPorUcDto } from './dto/filtrar-inscritos-por-uc.dto';
<<<<<<< HEAD
import { FilterHorariosPorUcDto } from './dto/filter-horarios-por-uc.dto';
import { FindEstudanteMatriculadoDTO } from './dto/find-studantes-matriculadoDTO';
=======
import { FilterHorariosInscritosPorUcDto } from './dto/filter-horarios-inscritos-por-uc';

>>>>>>> c1bbd56 (feat: ...)
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

  async listarGeralEstudantes(filter: FilterListagemGeralEstudantesDto) {
    const {
      page = 1,
      limit = 10,
      anoLectivo = 0,
      faculdade = 0,
      grauAcademico = 0,
      curso = 0,
      anoCurricular = 0,
      periodo = 0,
      nacionalidade = 0,
      necessidade = 0,
      sexo = 0,
      search,
    } = filter;
  
    const offset = (page - 1) * limit;
  
    const baseParams: Record<string, any> = {
      anoLectivo,
      anoLectivo_zero: anoLectivo,
      faculdade,
      faculdade_zero: faculdade,
      grauAcademico,
      grauAcademico_zero: grauAcademico,
      curso,
      curso_zero: curso,
      anoCurricular,
      anoCurricular_zero: anoCurricular,
      periodo,
      periodo_zero: periodo,
      nacionalidade,
      nacionalidade_zero: nacionalidade,
      necessidade,
      necessidade_zero: necessidade,
      sexo,
      sexo_zero: sexo,
    };
  
    let whereClause = `
      WHERE (tal.CODIGO = :anoLectivo OR :anoLectivo_zero = 0)
        AND (tc2.FACULDADE_ID = :faculdade OR :faculdade_zero = 0)
        AND (tc2.GRAU = :grauAcademico OR :grauAcademico_zero = 0)
        AND (tc2.CODIGO = :curso OR :curso_zero = 0)
        AND (tgc.CODIGO_CLASSE = :anoCurricular OR :anoCurricular_zero = 0)
        AND (tp2.CODIGO = :periodo OR :periodo_zero = 0)
        AND (tn.CODIGO = :nacionalidade OR :nacionalidade_zero = 0)
        AND (NVL(ne.ID, 0) = :necessidade OR :necessidade_zero = 0)
        AND (
          :sexo_zero = 0
          OR tp.SEXO = (
            SELECT ts.DESIGNACAO
            FROM FK2_TB_SEXO ts
            WHERE ts.CODIGO = :sexo
          )
        )
    `;
  
    if (search && search.trim()) {
      whereClause += `
        AND (
          UPPER(tp.NOME_COMPLETO) LIKE :search
          OR UPPER(NVL(TO_CHAR(tm.NUMEROALUNO), TO_CHAR(tm.CODIGO_ALUNO))) LIKE :search
        )
      `;
      baseParams.search = `%${search.trim().toUpperCase()}%`;
    }
  
    const baseFrom = `
      FROM FK2_TB_MATRICULAS tm
      INNER JOIN FK2_TB_CONFIRMACOES tc
        ON tc.CODIGO_MATRICULA = tm.CODIGO
      INNER JOIN FK2_TB_CURSOS tc2
        ON tc2.CODIGO = tm.CODIGO_CURSO
      INNER JOIN FK2_TB_FACULDADE tf
        ON tf.CODIGO = tc2.FACULDADE_ID
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
      INNER JOIN FK2_TB_NACIONALIDADES tn
        ON tn.CODIGO = tp.CODIGO_NACIONALIDADE
      INNER JOIN FK2_TB_ANO_LECTIVO tal
        ON tal.CODIGO = tc.CODIGO_ANO_LECTIVO
      LEFT JOIN FK2_NECESSIDADE_ESPECIAIS ne
        ON ne.ID = tp.NECESSIDADE_ESPECIAL_ID
      INNER JOIN FK2_TB_PERIODOS tp2
        ON tp.CODIGO_TURNO = tp2.CODIGO
      INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        ON tgca.CODIGO_MATRICULA = tm.CODIGO
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
    `;
  
    const sql = `
      SELECT *
      FROM (
        SELECT
          q.*,
          ROW_NUMBER() OVER (ORDER BY q.NOME ASC) AS RN
        FROM (
          SELECT DISTINCT
            NVL(tm.NUMEROALUNO, tm.CODIGO_ALUNO) AS NUMERO_MATRICULA,
            tp.NOME_COMPLETO AS NOME,
            '-' AS TIPO_ALUNO,
            tal.DESIGNACAO AS ANO_LECTIVO,
            tp.SEXO AS SEXO,
            tn.DESIGNACAO AS NATURALIDADE,
            NVL(ne.DESIGNACAO, '-') AS NECESSIDADE,
            tf.DESIGNACAO AS FACULDADE,
            tc2.DESIGNACAO AS CURSO,
            tgc.CODIGO_CLASSE AS ANO_CURRICULAR,
            tp2.DESIGNACAO AS PERIODO
          ${baseFrom}
          ${whereClause}
        ) q
      ) t
      WHERE t.RN BETWEEN :offset + 1 AND :offset + :limit
      ORDER BY t.RN
    `;
  
    const countSql = `
      SELECT COUNT(*) AS TOTAL
      FROM (
        SELECT DISTINCT
          NVL(tm.NUMEROALUNO, tm.CODIGO_ALUNO) AS NUMERO_MATRICULA,
          tp.NOME_COMPLETO AS NOME,
          tal.DESIGNACAO AS ANO_LECTIVO,
          tp.SEXO AS SEXO,
          tn.DESIGNACAO AS NATURALIDADE,
          NVL(ne.DESIGNACAO, '-') AS NECESSIDADE,
          tf.DESIGNACAO AS FACULDADE,
          tc2.DESIGNACAO AS CURSO,
          tgc.CODIGO_CLASSE AS ANO_CURRICULAR,
          tp2.DESIGNACAO AS PERIODO
        ${baseFrom}
        ${whereClause}
      ) x
    `;
  
    const dataParams = {
      ...baseParams,
      offset,
      limit,
    };
  
    const countParams = {
      ...baseParams,
    };
  
    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql, dataParams as any),
      this.dataSource.query(countSql, countParams as any),
    ]);
  
    const total = Number(countResult[0]?.TOTAL ?? 0);
  
    const data = result.map((row: any, index: number) => ({
      numero: offset + index + 1,
      numero_matricula: row.NUMERO_MATRICULA,
      nome: row.NOME,
      tipo_aluno: row.TIPO_ALUNO,
      ano_lectivo: row.ANO_LECTIVO,
      sexo: row.SEXO,
      naturalidade: row.NATURALIDADE,
      necessidade: row.NECESSIDADE,
      faculdade: row.FACULDADE,
      curso: row.CURSO,
      ano_curricular: row.ANO_CURRICULAR,
      periodo: row.PERIODO,
    }));
  
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

async listarInscritosPorUc(filter: FilterInscritosPorUcDto) {
  const {
    page = 1,
    limit = 10,
    anoLectivo = 0,
    curso = 0,
    anoCurricular = 0,
    semestre = 0,
    periodo = 0,
    cadeira = 0,
    horario = 0,
    estado = '0',
    search,
  } = filter;

  const offset = (page - 1) * limit;

  const estadoMap: Record<string, string | null> = {
    '0': null,
    '1': 'Em curso',
    '2': 'Pendente',
    '3': 'Fez com Sucesso'
  };

  const estadoNome = estadoMap[String(estado)] ?? null;

  const baseParams: Record<string, any> = {
    anoLectivo,
    anoLectivo_zero: anoLectivo,
    curso,
    curso_zero: curso,
    anoCurricular,
    anoCurricular_zero: anoCurricular,
    semestre,
    semestre_zero: semestre,
    cadeira,
    cadeira_zero: cadeira,
    horario,
    horario_zero: horario,
  };

  let whereClause = `
    WHERE (tgc.CODIGO = :cadeira OR :cadeira_zero = 0)
      AND (tc.CODIGO = :curso OR :curso_zero = 0)
      AND (tgc.CODIGO_CLASSE = :anoCurricular OR :anoCurricular_zero = 0)
      AND (tgc.CODIGO_SEMESTRE = :semestre OR :semestre_zero = 0)
      AND (tal.CODIGO = :anoLectivo OR :anoLectivo_zero = 0)
      AND (
        :horario_zero = 0
        OR JSON_VALUE(tgca.REF_HORARIO, '$.pk') = TO_CHAR(:horario)
      )
  `;

  if (estadoNome) {
    whereClause += `
      AND UPPER(tsgc.DESIGNACAO) = :estadoNome
    `;
    baseParams.estadoNome = estadoNome.toUpperCase();
  }

  if (search && search.trim()) {
    whereClause += `
      AND (
        UPPER(tp.NOME_COMPLETO) LIKE :search
        OR TO_CHAR(tm.CODIGO) LIKE :search
        OR TO_CHAR(NVL(tm.NUMEROALUNO, tm.CODIGO_ALUNO)) LIKE :search
      )
    `;
    baseParams.search = `%${search.trim().toUpperCase()}%`;
  }

  const baseFrom = `
  FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
  INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
    ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
  INNER JOIN FK2_TB_MATRICULAS tm
    ON tm.CODIGO = tgca.CODIGO_MATRICULA
  INNER JOIN FK2_TB_ADMISSAO ta
    ON ta.CODIGO = tm.CODIGO_ALUNO
  INNER JOIN FK2_TB_PREINSCRICAO tp
    ON tp.CODIGO = ta.PRE_INCRICAO
  INNER JOIN FK2_TB_CURSOS tc
    ON tc.CODIGO = tm.CODIGO_CURSO
  INNER JOIN FK2_TB_STATUS_GRADE_CURRICULAR tsgc
    ON tsgc.CODIGO = tgca.CODIGO_STATUS_GRADE_CURRICULAR
  INNER JOIN FK2_TB_CONFIRMACOES tcf
    ON tcf.CODIGO_MATRICULA = tm.CODIGO
  INNER JOIN FK2_TB_ANO_LECTIVO tal
    ON tal.CODIGO = tcf.CODIGO_ANO_LECTIVO
  LEFT JOIN FK2_TB_BOLSEIROS fb
    ON fb.CODIGO_MATRICULA = tm.CODIGO
    AND fb.CODIGO_ANOLECTIVO = :anoLectivo
    AND fb.SEMESTRE = tgc.CODIGO_SEMESTRE
    AND fb.STATUS_ = 0
  LEFT JOIN FK2_TB_INSTITUICAO i
    ON i.CODIGO = fb.CODIGO_INSTITUICAO
`;

  const sql = `
  SELECT *
  FROM (
    SELECT
      q.*,
      ROW_NUMBER() OVER (ORDER BY q.NOME ASC) AS RN
    FROM (
      SELECT DISTINCT
        tm.CODIGO AS MATRICULA,
        tp.NOME_COMPLETO AS NOME,
        NVL(fn_tipo_estudante(fb.CODIGO, i.RENUNCIA, fb.CODIGO_TIPO_BOLSA), '-') AS TIPO_ALUNO,
        tc.DESIGNACAO AS CURSO,
        tsgc.DESIGNACAO AS ESTADO
      ${baseFrom}
      ${whereClause}
    ) q
  ) t
  WHERE t.RN BETWEEN :offset + 1 AND :offset + :limit
  ORDER BY t.RN
`;

  const countSql = `
    SELECT COUNT(*) AS TOTAL
    FROM (
      SELECT DISTINCT
  tm.CODIGO AS MATRICULA,
  tp.NOME_COMPLETO AS NOME,
  NVL(fn_tipo_estudante(fb.CODIGO, i.RENUNCIA, fb.CODIGO_TIPO_BOLSA), '-') AS TIPO_ALUNO,
  tc.DESIGNACAO AS CURSO,
  tsgc.DESIGNACAO AS ESTADO
      ${baseFrom}
      ${whereClause}
    ) x
  `;

  const dataParams = {
    ...baseParams,
    offset,
    limit,
  };

  const countParams = {
    ...baseParams,
  };

  const [result, countResult] = await Promise.all([
    this.dataSource.query(sql, dataParams as any),
    this.dataSource.query(countSql, countParams as any),
  ]);

  const total = Number(countResult[0]?.TOTAL ?? 0);

  const data = result.map((row: any, index: number) => ({
    numero: offset + index + 1,
    matricula: row.MATRICULA,
    nome: row.NOME,
    tipo_aluno: row.TIPO_ALUNO,
    curso: row.CURSO,
    estado: row.ESTADO,
  }));

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

async listarHorariosDisponiveisInscritosPorUc(
  filter: FilterHorariosInscritosPorUcDto,
) {
  const {
    anoLectivo = 0,
    curso = 0,
    anoCurricular = 0,
    semestre = 0,
    periodo = 0,
    cadeira = 0,
  } = filter;

  const sql = `
    SELECT DISTINCT
      JSON_VALUE(
        tgca.REF_HORARIO,
        '$.pk' RETURNING NUMBER NULL ON ERROR
      ) AS CODIGO,
      JSON_VALUE(tgca.REF_HORARIO, '$.desc') AS DESIGNACAO
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
    INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
      ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
    INNER JOIN FK2_TB_MATRICULAS tm
      ON tm.CODIGO = tgca.CODIGO_MATRICULA
    INNER JOIN FK2_TB_CONFIRMACOES tcf
      ON tcf.CODIGO_MATRICULA = tm.CODIGO
    WHERE (tgc.CODIGO = :cadeira OR :cadeira = 0)
      AND (tm.CODIGO_CURSO = :curso OR :curso = 0)
      AND (tgc.CODIGO_CLASSE = :anoCurricular OR :anoCurricular = 0)
      AND (tgc.CODIGO_SEMESTRE = :semestre OR :semestre = 0)
      AND (tcf.CODIGO_ANO_LECTIVO = :anoLectivo OR :anoLectivo = 0)
      AND JSON_VALUE(
        tgca.REF_HORARIO,
        '$.pk' RETURNING NUMBER NULL ON ERROR
      ) IS NOT NULL
    ORDER BY DESIGNACAO ASC
  `;

  return await this.dataSource.query(sql, {
    anoLectivo,
    curso,
    anoCurricular,
    semestre,
    cadeira,
  } as any);
}


}
