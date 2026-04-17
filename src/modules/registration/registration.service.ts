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
import { FindEstudanteMatriculadoDTO } from './dto/find-studantes-matriculadoDTO';
import { FilterHorariosInscritosPorUcDto } from './dto/filter-horarios-inscritos-por-uc';
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

async listarGeralEstudantes(filter: FilterListagemGeralEstudantesDto) {
  const {
    page = 1,
    limit = 10,
    anoLectivo,
    faculdade,
    grauAcademico,
    curso,
    anoCurricular,
    periodo,
    nacionalidade,
    necessidade,
    sexo,
    search,
  } = filter;

  const offset = (page - 1) * limit;

  const params: any = {
    offset,
    limit: offset + limit,
  };

  let sql = `
    SELECT *
    FROM (
      SELECT
        dados.*,
        ROW_NUMBER() OVER (ORDER BY dados.NOME ASC) AS rn,
        COUNT(*) OVER () AS total_registros
      FROM (
        SELECT DISTINCT
          NVL(tm.NUMEROALUNO, tm.CODIGO_ALUNO)          AS NUMERO_MATRICULA,
          tp.NOME_COMPLETO                               AS NOME,
          NVL(fn_tipo_estudante(fb.CODIGO, i.RENUNCIA, fb.CODIGO_TIPO_BOLSA), '-') AS TIPO_ALUNO,
          tal.DESIGNACAO                                 AS ANO_LECTIVO,
          tp.SEXO                                        AS SEXO,
          tn.DESIGNACAO                                  AS NATURALIDADE,
          NVL(ne.DESIGNACAO, '-')                        AS NECESSIDADE,
          tf.DESIGNACAO                                  AS FACULDADE,
          tc2.DESIGNACAO                                 AS CURSO,
          tgc.CODIGO_CLASSE                              AS ANO_CURRICULAR,
          tp2.DESIGNACAO                                 AS PERIODO
        FROM FK2_TB_MATRICULAS tm
        INNER JOIN FK2_TB_CONFIRMACOES tc          ON tc.CODIGO_MATRICULA = tm.CODIGO
        INNER JOIN FK2_TB_CURSOS tc2               ON tc2.CODIGO = tm.CODIGO_CURSO
        INNER JOIN FK2_TB_FACULDADE tf             ON tf.CODIGO = tc2.FACULDADE_ID
        INNER JOIN FK2_TB_ADMISSAO ta              ON ta.CODIGO = tm.CODIGO_ALUNO
        INNER JOIN FK2_TB_PREINSCRICAO tp          ON tp.CODIGO = ta.PRE_INCRICAO
        INNER JOIN FK2_TB_NACIONALIDADES tn        ON tn.CODIGO = tp.CODIGO_NACIONALIDADE
        INNER JOIN FK2_TB_ANO_LECTIVO tal          ON tal.CODIGO = tc.CODIGO_ANO_LECTIVO
        LEFT  JOIN FK2_NECESSIDADE_ESPECIAIS ne    ON ne.ID = tp.NECESSIDADE_ESPECIAL_ID
        INNER JOIN FK2_TB_PERIODOS tp2             ON tp.CODIGO_TURNO = tp2.CODIGO
        INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca ON tgca.CODIGO_MATRICULA = tm.CODIGO
        INNER JOIN FK2_TB_GRADE_CURRICULAR tgc     ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
        LEFT  JOIN FK2_TB_BOLSEIROS fb             ON fb.CODIGO_MATRICULA = tm.CODIGO
                                                   AND fb.CODIGO_ANOLECTIVO = tal.CODIGO
                                                   AND fb.SEMESTRE = tgc.CODIGO_SEMESTRE
                                                   AND fb.STATUS_ = 0
        LEFT  JOIN FK2_TB_INSTITUICAO i            ON i.CODIGO = fb.CODIGO_INSTITUICAO
        WHERE 1 = 1
  `;

  // Filtros obrigatórios / principais
  if (anoLectivo && anoLectivo > 0) {
    sql += ` AND tal.CODIGO = :anoLectivo`;
    params.anoLectivo = anoLectivo;
  }

  // Filtros opcionais
  if (faculdade && faculdade > 0) {
    sql += ` AND tc2.FACULDADE_ID = :faculdade`;
    params.faculdade = faculdade;
  }

  if (grauAcademico && grauAcademico > 0) {
    sql += ` AND tc2.GRAU = :grauAcademico`;
    params.grauAcademico = grauAcademico;
  }

  if (curso && curso > 0) {
    sql += ` AND tc2.CODIGO = :curso`;
    params.curso = curso;
  }

  if (anoCurricular && anoCurricular > 0) {
    sql += ` AND tgc.CODIGO_CLASSE = :anoCurricular`;
    params.anoCurricular = anoCurricular;
  }

  if (periodo && periodo > 0) {
    sql += ` AND tp2.CODIGO = :periodo`;
    params.periodo = periodo;
  }

  if (nacionalidade && nacionalidade > 0) {
    sql += ` AND tn.CODIGO = :nacionalidade`;
    params.nacionalidade = nacionalidade;
  }

  if (necessidade && necessidade > 0) {
    sql += ` AND NVL(ne.ID, 0) = :necessidade`;
    params.necessidade = necessidade;
  }

  if (sexo && sexo > 0) {
    sql += ` AND tp.SEXO = (SELECT DESIGNACAO FROM FK2_TB_SEXO WHERE CODIGO = :sexo)`;
    params.sexo = sexo;
  }

  // Filtro de pesquisa (nome ou número de matrícula)
  if (search && search.trim()) {
    const searchTerm = `%${search.trim().toUpperCase()}%`;
    sql += `
      AND (
        UPPER(tp.NOME_COMPLETO) LIKE :search
        OR UPPER(NVL(TO_CHAR(tm.NUMEROALUNO), TO_CHAR(tm.CODIGO_ALUNO))) LIKE :search
      )
    `;
    params.search = searchTerm;
  }

  // Fechamento das subqueries e paginação
  sql += `
        ) dados
    )
    WHERE rn > :offset
      AND rn <= :limit
    ORDER BY rn
  `;

  const result = await this.dataSource.query(sql, params);

  const total = result.length > 0 ? Number(result[0].TOTAL_REGISTROS) : 0;

  const data = result.map((row: any) => {
    const { RN, TOTAL_REGISTROS, ...item } = row;
    return item;
  });

  return {
    data: await toLowerCaseKeys(data),   // mantendo o padrão do seu outro método
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

  // Mapeamento de estado
  const estadoMap: Record<string, string | null> = {
    '0': null,
    '1': 'Em curso',
    '2': 'Pendente',
    '3': 'Fez com Sucesso'
  };

  const estadoNome = estadoMap[String(estado)] ?? null;

  // ====================== PARÂMETROS ======================
  const params: any = {
    anoLectivo,           // ← Sempre incluído (mesmo que 0)
    offset,
    limit: offset + limit,
  };

  let sql = `
    SELECT *
    FROM (
      SELECT
        dados.*,
        ROW_NUMBER() OVER (ORDER BY dados.NOME ASC) AS rn,
        COUNT(*) OVER () AS total_registros
      FROM (
        SELECT DISTINCT
          tm.CODIGO                                      AS MATRICULA,
          tp.NOME_COMPLETO                               AS NOME,
          NVL(fn_tipo_estudante(fb.CODIGO, i.RENUNCIA, fb.CODIGO_TIPO_BOLSA), '-') AS TIPO_ALUNO,
          tc.DESIGNACAO                                  AS CURSO,
          tsgc.DESIGNACAO                                AS ESTADO
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
        WHERE 1 = 1
  `;

  // ==================== FILTROS ====================

  if (anoLectivo && anoLectivo > 0) {
    sql += ` AND tal.CODIGO = :anoLectivo`;
  }

  if (curso && curso > 0) {
    sql += ` AND tc.CODIGO = :curso`;
    params.curso = curso;
  }

  if (anoCurricular && anoCurricular > 0) {
    sql += ` AND tgc.CODIGO_CLASSE = :anoCurricular`;
    params.anoCurricular = anoCurricular;
  }

  if (semestre && semestre > 0) {
    sql += ` AND tgc.CODIGO_SEMESTRE = :semestre`;
    params.semestre = semestre;
  }

  if (cadeira && cadeira > 0) {
    sql += ` AND tgc.CODIGO = :cadeira`;
    params.cadeira = cadeira;
  }

  if (horario && horario > 0) {
    sql += ` AND JSON_VALUE(tgca.REF_HORARIO, '$.pk') = TO_CHAR(:horario)`;
    params.horario = horario;
  }

  if (estadoNome) {
    sql += ` AND UPPER(tsgc.DESIGNACAO) = :estadoNome`;
    params.estadoNome = estadoNome.toUpperCase();
  }

  // Filtro de pesquisa
  if (search && search.trim()) {
    const searchTerm = `%${search.trim().toUpperCase()}%`;
    sql += `
      AND (
        UPPER(tp.NOME_COMPLETO) LIKE :search
        OR TO_CHAR(tm.CODIGO) LIKE :search
        OR TO_CHAR(NVL(tm.NUMEROALUNO, tm.CODIGO_ALUNO)) LIKE :search
      )
    `;
    params.search = searchTerm;
  }

  // ==================== FECHAMENTO ====================
  sql += `
        ) dados
    )
    WHERE rn > :offset
      AND rn <= :limit
    ORDER BY rn
  `;

  const result = await this.dataSource.query(sql, params);

  const total = result.length > 0 ? Number(result[0].TOTAL_REGISTROS) : 0;

  const data = result.map((row: any) => {
    const { RN, TOTAL_REGISTROS, ...item } = row;
    return item;
  });

  return {
    data: await toLowerCaseKeys(data),
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

 async listarEstadoMatriculaPorHorario(filter: any) {
  const {
    page = 1,
    limit = 10,
    anoLectivo = 0,
    curso = 0,
    anoCurricular = 0,
    semestre = 0,
    turno = 0,
    unidadeCurricular = 0,
    horario = 0,
    estado = 0,
    search,
  } = filter;

  const offset = (page - 1) * limit;
  const calcularClasse = Number(anoCurricular) > 0;
  const searchValue =
    search && String(search).trim()
      ? `%${String(search).trim().toUpperCase()}%`
      : null;

  const dataParamsSemClasse: Record<string, any> = {
    anoLectivo_base: anoLectivo,
    anoLectivo_bolsa: anoLectivo,

    curso_base: curso,
    curso_zero_base: curso,

    semestre_base: semestre,
    semestre_zero_base: semestre,

    turno_base: turno,
    turno_zero_base: turno,

    estado_base: estado,
    estado_zero_base: estado,

    horario_base: horario,
    horario_zero_base: horario,

    unidadeCurricular_base: unidadeCurricular,
    unidadeCurricular_zero_base: unidadeCurricular,

    search_nome: searchValue,
    search_matricula: searchValue,
    search_curso: searchValue,
    search_estado: searchValue,
    search_horario: searchValue,

    offset_rows: offset,
    limit_rows: limit,
  };

  const countParamsSemClasse: Record<string, any> = {
    anoLectivo_base: anoLectivo,

    curso_base: curso,
    curso_zero_base: curso,

    semestre_base: semestre,
    semestre_zero_base: semestre,

    turno_base: turno,
    turno_zero_base: turno,

    estado_base: estado,
    estado_zero_base: estado,

    horario_base: horario,
    horario_zero_base: horario,

    unidadeCurricular_base: unidadeCurricular,
    unidadeCurricular_zero_base: unidadeCurricular,

    search_nome: searchValue,
    search_matricula: searchValue,
    search_curso: searchValue,
    search_estado: searchValue,
    search_horario: searchValue,
  };

  const dataParamsComClasse: Record<string, any> = {
    ...dataParamsSemClasse,
    anoLectivo_plano: anoLectivo,
    anoCurricular_final: anoCurricular,
  };

  const countParamsComClasse: Record<string, any> = {
    ...countParamsSemClasse,
    anoLectivo_plano: anoLectivo,
    anoCurricular_final: anoCurricular,
  };

  const countSqlSemClasse = `
    SELECT COUNT(*) AS TOTAL
    FROM (
      SELECT DISTINCT tm.CODIGO
      FROM FK2_MGA_TB_SITUACAO_FINANCEIRA_ALUNO mtsfa
      INNER JOIN FK2_TB_ESTADO_MATRICULA tem
        ON tem.CODIGO = mtsfa.FK_TB_ESTADO_MATRICULA
      INNER JOIN FK2_TB_MATRICULAS tm
        ON tm.CODIGO = mtsfa.FK_MATRICULA
      INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
      INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        ON tgca.CODIGO_MATRICULA = tm.CODIGO
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
      INNER JOIN FK2_MGH_TB_HORARIO mth
        ON JSON_VALUE(mth.REF_GRADE_CURRICULAR, '$.pk' RETURNING NUMBER NULL ON ERROR) = tgc.CODIGO
      WHERE tgca.CODIGO_ANO_LECTIVO = :anoLectivo_base
        AND tgca.CODIGO_STATUS_GRADE_CURRICULAR NOT IN (4, 5)
        AND (tc.CODIGO = :curso_base OR :curso_zero_base = 0)
        AND (tgc.CODIGO_SEMESTRE = :semestre_base OR :semestre_zero_base = 0)
        AND (
          JSON_VALUE(mth.REF_PERIODICIDADE, '$.pkPeriodo' RETURNING NUMBER NULL ON ERROR) = :turno_base
          OR :turno_zero_base = 0
        )
        AND (tem.CODIGO = :estado_base OR :estado_zero_base = 0)
        AND (mth.PK_HORARIO = :horario_base OR :horario_zero_base = 0)
        AND mth.FK_ESTADO_HORARIO_WF = 3
        AND (
          JSON_VALUE(mth.REF_GRADE_CURRICULAR, '$.pk' RETURNING NUMBER NULL ON ERROR) = :unidadeCurricular_base
          OR :unidadeCurricular_zero_base = 0
        )
        AND (
          :search_nome IS NULL
          OR UPPER(tp.NOME_COMPLETO) LIKE :search_nome
          OR UPPER(TO_CHAR(tm.CODIGO)) LIKE :search_matricula
          OR UPPER(NVL(tc.DESIGNACAO, '-')) LIKE :search_curso
          OR UPPER(NVL(tem.DESIGNACAO, '-')) LIKE :search_estado
          OR UPPER(NVL(mth.DESIGNACAO, '-')) LIKE :search_horario
        )
    )
  `;

  const sqlComClasse = `
    WITH base_estudantes AS (
      SELECT DISTINCT
        tm.CODIGO AS MATRICULA,
        tp.NOME_COMPLETO AS NOME,
        tc.DESIGNACAO AS CURSO,
        tem.DESIGNACAO AS ESTADO,
        tem.OBS AS COR,
        mth.PK_HORARIO AS CODIGO_HORARIO,
        mth.DESIGNACAO AS HORARIO,
        tm.CODIGO_CURSO AS CODIGO_CURSO,
        NVL(fn_tipo_estudante(fb.CODIGO, i.RENUNCIA, fb.CODIGO_TIPO_BOLSA), '-') AS TIPO_ALUNO
      FROM FK2_MGA_TB_SITUACAO_FINANCEIRA_ALUNO mtsfa
      INNER JOIN FK2_TB_ESTADO_MATRICULA tem
        ON tem.CODIGO = mtsfa.FK_TB_ESTADO_MATRICULA
      INNER JOIN FK2_TB_MATRICULAS tm
        ON tm.CODIGO = mtsfa.FK_MATRICULA
      INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
      INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        ON tgca.CODIGO_MATRICULA = tm.CODIGO
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
      INNER JOIN FK2_MGH_TB_HORARIO mth
        ON JSON_VALUE(mth.REF_GRADE_CURRICULAR, '$.pk' RETURNING NUMBER NULL ON ERROR) = tgc.CODIGO
      LEFT JOIN FK2_TB_BOLSEIROS fb
        ON fb.CODIGO_MATRICULA = tm.CODIGO
        AND fb.CODIGO_ANOLECTIVO = :anoLectivo_bolsa
        AND fb.SEMESTRE = tgc.CODIGO_SEMESTRE
        AND fb.STATUS_ = 0
      LEFT JOIN FK2_TB_INSTITUICAO i
        ON i.CODIGO = fb.CODIGO_INSTITUICAO
      WHERE tgca.CODIGO_ANO_LECTIVO = :anoLectivo_base
        AND tgca.CODIGO_STATUS_GRADE_CURRICULAR NOT IN (4, 5)
        AND (tc.CODIGO = :curso_base OR :curso_zero_base = 0)
        AND (tgc.CODIGO_SEMESTRE = :semestre_base OR :semestre_zero_base = 0)
        AND (
          JSON_VALUE(mth.REF_PERIODICIDADE, '$.pkPeriodo' RETURNING NUMBER NULL ON ERROR) = :turno_base
          OR :turno_zero_base = 0
        )
        AND (tem.CODIGO = :estado_base OR :estado_zero_base = 0)
        AND (mth.PK_HORARIO = :horario_base OR :horario_zero_base = 0)
        AND mth.FK_ESTADO_HORARIO_WF = 3
        AND (
          JSON_VALUE(mth.REF_GRADE_CURRICULAR, '$.pk' RETURNING NUMBER NULL ON ERROR) = :unidadeCurricular_base
          OR :unidadeCurricular_zero_base = 0
        )
    ),

    plano_por_classe AS (
      SELECT
        tpcc.CODIGO_CURSO,
        tgc.CODIGO_CLASSE AS CLASSE,
        COUNT(tpcg.CODIGO_GRADE_CURRICULAR) AS QTD_PLANO
      FROM FK2_TB_PLANO_CURRICULAR_GRADE tpcg
      INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc
        ON tpcc.CODIGO = tpcg.CODIGO_PLANO_CURRICULAR_CURSO
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.CODIGO = tpcg.CODIGO_GRADE_CURRICULAR
      WHERE tpcc.CODIGO_ANO_LECTIVO = :anoLectivo_plano
      GROUP BY tpcc.CODIGO_CURSO, tgc.CODIGO_CLASSE
    ),

    feitas_por_classe AS (
      SELECT
        tgca.CODIGO_MATRICULA AS MATRICULA,
        tgc.CODIGO_CLASSE AS CLASSE,
        COUNT(tgca.CODIGO) AS QTD_FEITAS
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
      WHERE tgca.CODIGO_STATUS_GRADE_CURRICULAR = 3
      GROUP BY tgca.CODIGO_MATRICULA, tgc.CODIGO_CLASSE
    ),

    classes_avaliadas AS (
      SELECT
        b.MATRICULA,
        b.CODIGO_CURSO,
        p.CLASSE,
        p.QTD_PLANO,
        NVL(f.QTD_FEITAS, 0) AS QTD_FEITAS,
        CASE
          WHEN NVL(f.QTD_FEITAS, 0) > (p.QTD_PLANO / 2) THEN 1
          ELSE 0
        END AS SUPEROU_METADE
      FROM (SELECT DISTINCT MATRICULA, CODIGO_CURSO FROM base_estudantes) b
      INNER JOIN plano_por_classe p
        ON p.CODIGO_CURSO = b.CODIGO_CURSO
      LEFT JOIN feitas_por_classe f
        ON f.MATRICULA = b.MATRICULA
       AND f.CLASSE = p.CLASSE
    ),

    primeira_classe_pendente AS (
      SELECT
        MATRICULA,
        MIN(CLASSE) AS ANO_CURRICULAR
      FROM classes_avaliadas
      WHERE SUPEROU_METADE = 0
      GROUP BY MATRICULA
    ),

    ultima_classe AS (
      SELECT
        MATRICULA,
        MAX(CLASSE) AS ULTIMA_CLASSE
      FROM classes_avaliadas
      GROUP BY MATRICULA
    ),

    classe_final AS (
      SELECT
        u.MATRICULA,
        NVL(p.ANO_CURRICULAR, u.ULTIMA_CLASSE) AS ANO_CURRICULAR
      FROM ultima_classe u
      LEFT JOIN primeira_classe_pendente p
        ON p.MATRICULA = u.MATRICULA
    ),

    final_data AS (
      SELECT
        b.*,
        cf.ANO_CURRICULAR
      FROM base_estudantes b
      LEFT JOIN classe_final cf
        ON cf.MATRICULA = b.MATRICULA
      WHERE (
        cf.ANO_CURRICULAR = :anoCurricular_final
        OR :anoCurricular_final = 0
      )
        AND (
          :search_nome IS NULL
          OR UPPER(b.NOME) LIKE :search_nome
          OR UPPER(TO_CHAR(b.MATRICULA)) LIKE :search_matricula
          OR UPPER(NVL(b.CURSO, '-')) LIKE :search_curso
          OR UPPER(NVL(b.ESTADO, '-')) LIKE :search_estado
          OR UPPER(NVL(b.HORARIO, '-')) LIKE :search_horario
        )
    )

    SELECT *
    FROM (
      SELECT
        f.*,
        ROW_NUMBER() OVER (ORDER BY f.NOME ASC) AS RN
      FROM final_data f
    ) t
    WHERE t.RN BETWEEN :offset_rows + 1 AND :offset_rows + :limit_rows
    ORDER BY t.RN
  `;

  const countSqlComClasse = `
    WITH base_estudantes AS (
      SELECT DISTINCT
        tm.CODIGO AS MATRICULA,
        tm.CODIGO_CURSO AS CODIGO_CURSO,
        tp.NOME_COMPLETO AS NOME,
        tc.DESIGNACAO AS CURSO,
        tem.DESIGNACAO AS ESTADO,
        mth.DESIGNACAO AS HORARIO
      FROM FK2_MGA_TB_SITUACAO_FINANCEIRA_ALUNO mtsfa
      INNER JOIN FK2_TB_ESTADO_MATRICULA tem
        ON tem.CODIGO = mtsfa.FK_TB_ESTADO_MATRICULA
      INNER JOIN FK2_TB_MATRICULAS tm
        ON tm.CODIGO = mtsfa.FK_MATRICULA
      INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
      INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        ON tgca.CODIGO_MATRICULA = tm.CODIGO
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
      INNER JOIN FK2_MGH_TB_HORARIO mth
        ON JSON_VALUE(mth.REF_GRADE_CURRICULAR, '$.pk' RETURNING NUMBER NULL ON ERROR) = tgc.CODIGO
      WHERE tgca.CODIGO_ANO_LECTIVO = :anoLectivo_base
        AND tgca.CODIGO_STATUS_GRADE_CURRICULAR NOT IN (4, 5)
        AND (tc.CODIGO = :curso_base OR :curso_zero_base = 0)
        AND (tgc.CODIGO_SEMESTRE = :semestre_base OR :semestre_zero_base = 0)
        AND (
          JSON_VALUE(mth.REF_PERIODICIDADE, '$.pkPeriodo' RETURNING NUMBER NULL ON ERROR) = :turno_base
          OR :turno_zero_base = 0
        )
        AND (tem.CODIGO = :estado_base OR :estado_zero_base = 0)
        AND (mth.PK_HORARIO = :horario_base OR :horario_zero_base = 0)
        AND mth.FK_ESTADO_HORARIO_WF = 3
        AND (
          JSON_VALUE(mth.REF_GRADE_CURRICULAR, '$.pk' RETURNING NUMBER NULL ON ERROR) = :unidadeCurricular_base
          OR :unidadeCurricular_zero_base = 0
        )
    ),

    plano_por_classe AS (
      SELECT
        tpcc.CODIGO_CURSO,
        tgc.CODIGO_CLASSE AS CLASSE,
        COUNT(tpcg.CODIGO_GRADE_CURRICULAR) AS QTD_PLANO
      FROM FK2_TB_PLANO_CURRICULAR_GRADE tpcg
      INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc
        ON tpcc.CODIGO = tpcg.CODIGO_PLANO_CURRICULAR_CURSO
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.CODIGO = tpcg.CODIGO_GRADE_CURRICULAR
      WHERE tpcc.CODIGO_ANO_LECTIVO = :anoLectivo_plano
      GROUP BY tpcc.CODIGO_CURSO, tgc.CODIGO_CLASSE
    ),

    feitas_por_classe AS (
      SELECT
        tgca.CODIGO_MATRICULA AS MATRICULA,
        tgc.CODIGO_CLASSE AS CLASSE,
        COUNT(tgca.CODIGO) AS QTD_FEITAS
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
      WHERE tgca.CODIGO_STATUS_GRADE_CURRICULAR = 3
      GROUP BY tgca.CODIGO_MATRICULA, tgc.CODIGO_CLASSE
    ),

    classes_avaliadas AS (
      SELECT
        b.MATRICULA,
        b.CODIGO_CURSO,
        p.CLASSE,
        p.QTD_PLANO,
        NVL(f.QTD_FEITAS, 0) AS QTD_FEITAS,
        CASE
          WHEN NVL(f.QTD_FEITAS, 0) > (p.QTD_PLANO / 2) THEN 1
          ELSE 0
        END AS SUPEROU_METADE
      FROM (SELECT DISTINCT MATRICULA, CODIGO_CURSO FROM base_estudantes) b
      INNER JOIN plano_por_classe p
        ON p.CODIGO_CURSO = b.CODIGO_CURSO
      LEFT JOIN feitas_por_classe f
        ON f.MATRICULA = b.MATRICULA
       AND f.CLASSE = p.CLASSE
    ),

    primeira_classe_pendente AS (
      SELECT
        MATRICULA,
        MIN(CLASSE) AS ANO_CURRICULAR
      FROM classes_avaliadas
      WHERE SUPEROU_METADE = 0
      GROUP BY MATRICULA
    ),

    ultima_classe AS (
      SELECT
        MATRICULA,
        MAX(CLASSE) AS ULTIMA_CLASSE
      FROM classes_avaliadas
      GROUP BY MATRICULA
    ),

    classe_final AS (
      SELECT
        u.MATRICULA,
        NVL(p.ANO_CURRICULAR, u.ULTIMA_CLASSE) AS ANO_CURRICULAR
      FROM ultima_classe u
      LEFT JOIN primeira_classe_pendente p
        ON p.MATRICULA = u.MATRICULA
    )

    SELECT COUNT(*) AS TOTAL
    FROM (
      SELECT DISTINCT b.MATRICULA
      FROM base_estudantes b
      LEFT JOIN classe_final cf
        ON cf.MATRICULA = b.MATRICULA
      WHERE (
        cf.ANO_CURRICULAR = :anoCurricular_final
        OR :anoCurricular_final = 0
      )
        AND (
          :search_nome IS NULL
          OR UPPER(b.NOME) LIKE :search_nome
          OR UPPER(TO_CHAR(b.MATRICULA)) LIKE :search_matricula
          OR UPPER(NVL(b.CURSO, '-')) LIKE :search_curso
          OR UPPER(NVL(b.ESTADO, '-')) LIKE :search_estado
          OR UPPER(NVL(b.HORARIO, '-')) LIKE :search_horario
        )
    )
  `;

  const sql = sqlComClasse;
  const countSql = calcularClasse ? countSqlComClasse : countSqlSemClasse;
  const dataParams = dataParamsComClasse;
  const countParams = calcularClasse ? countParamsComClasse : countParamsSemClasse;

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
    horario: row.HORARIO,
    curso: row.CURSO,
    estado: row.ESTADO,
    cor: row.COR,
    ano_curricular: row.ANO_CURRICULAR,
  }));

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

async listarEstudantesPorEstadoMatricula(filter: any) {
  const {
    page = 1,
    limit = 10,
    anoLectivo = 0,
    curso = 0,
    turno = 0,
    estado = 0,
    anoCurricular = 0,
    search,
  } = filter;

  const offset = (page - 1) * limit;
  const searchValue =
    search && String(search).trim()
      ? `%${String(search).trim().toUpperCase()}%`
      : null;

  const dataParams: Record<string, any> = {
    anoLectivo_base: anoLectivo,
    anoLectivo_bolsa: anoLectivo,
    anoLectivo_plano: anoLectivo,

    curso_base: curso,
    curso_zero_base: curso,

    turno_base: turno,
    turno_zero_base: turno,

    estado_base: estado,
    estado_zero_base: estado,

    anoCurricular_final: anoCurricular,

    search_nome: searchValue,
    search_matricula: searchValue,
    search_curso: searchValue,
    search_estado: searchValue,
    search_telefone: searchValue,
    search_email: searchValue,

    offset_rows: offset,
    limit_rows: limit,
  };

  const countParams: Record<string, any> = {
    anoLectivo_base: anoLectivo,
    anoLectivo_plano: anoLectivo,

    curso_base: curso,
    curso_zero_base: curso,

    turno_base: turno,
    turno_zero_base: turno,

    estado_base: estado,
    estado_zero_base: estado,

    anoCurricular_final: anoCurricular,

    search_nome: searchValue,
    search_matricula: searchValue,
    search_curso: searchValue,
    search_estado: searchValue,
    search_telefone: searchValue,
    search_email: searchValue,
  };

  const sql = `
    WITH base_estudantes AS (
      SELECT DISTINCT
        tm.CODIGO AS MATRICULA,
        tp.NOME_COMPLETO AS NOME,
        tp.CONTACTOS_TELEFONICOS AS TELEFONE,
        tp.EMAIL AS EMAIL,
        tc.DESIGNACAO AS CURSO,
        tem.DESIGNACAO AS ESTADO,
        tem.OBS AS COR,
        tm.CODIGO_CURSO AS CODIGO_CURSO,
        NVL(fn_tipo_estudante(fb.CODIGO, i.RENUNCIA, fb.CODIGO_TIPO_BOLSA), '-') AS TIPO_ALUNO
      FROM FK2_MGA_TB_SITUACAO_FINANCEIRA_ALUNO mtsfa
      INNER JOIN FK2_TB_ESTADO_MATRICULA tem
        ON tem.CODIGO = mtsfa.FK_TB_ESTADO_MATRICULA
      INNER JOIN FK2_TB_MATRICULAS tm
        ON tm.CODIGO = mtsfa.FK_MATRICULA
      INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
      INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        ON tgca.CODIGO_MATRICULA = tm.CODIGO
      LEFT JOIN FK2_TB_BOLSEIROS fb
        ON fb.CODIGO_MATRICULA = tm.CODIGO
        AND fb.CODIGO_ANOLECTIVO = :anoLectivo_bolsa
        AND fb.STATUS_ = 0
      LEFT JOIN FK2_TB_INSTITUICAO i
        ON i.CODIGO = fb.CODIGO_INSTITUICAO
      WHERE tgca.CODIGO_ANO_LECTIVO = :anoLectivo_base
        AND tgca.CODIGO_STATUS_GRADE_CURRICULAR IN (1, 2, 3)
        AND (tc.CODIGO = :curso_base OR :curso_zero_base = 0)
        AND (
          tp.CODIGO_TURNO = :turno_base
          OR :turno_zero_base = 0
        )
        AND (tem.CODIGO = :estado_base OR :estado_zero_base = 0)
    ),

    plano_por_classe AS (
      SELECT
        tpcc.CODIGO_CURSO,
        tgc.CODIGO_CLASSE AS CLASSE,
        COUNT(tpcg.CODIGO_GRADE_CURRICULAR) AS QTD_PLANO
      FROM FK2_TB_PLANO_CURRICULAR_GRADE tpcg
      INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc
        ON tpcc.CODIGO = tpcg.CODIGO_PLANO_CURRICULAR_CURSO
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.CODIGO = tpcg.CODIGO_GRADE_CURRICULAR
      WHERE tpcc.CODIGO_ANO_LECTIVO = :anoLectivo_plano
      GROUP BY tpcc.CODIGO_CURSO, tgc.CODIGO_CLASSE
    ),

    feitas_por_classe AS (
      SELECT
        tgca.CODIGO_MATRICULA AS MATRICULA,
        tgc.CODIGO_CLASSE AS CLASSE,
        COUNT(tgca.CODIGO) AS QTD_FEITAS
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
      WHERE tgca.CODIGO_STATUS_GRADE_CURRICULAR = 3
      GROUP BY tgca.CODIGO_MATRICULA, tgc.CODIGO_CLASSE
    ),

    classes_avaliadas AS (
      SELECT
        b.MATRICULA,
        b.CODIGO_CURSO,
        p.CLASSE,
        p.QTD_PLANO,
        NVL(f.QTD_FEITAS, 0) AS QTD_FEITAS,
        CASE
          WHEN NVL(f.QTD_FEITAS, 0) > (p.QTD_PLANO / 2) THEN 1
          ELSE 0
        END AS SUPEROU_METADE
      FROM (SELECT DISTINCT MATRICULA, CODIGO_CURSO FROM base_estudantes) b
      INNER JOIN plano_por_classe p
        ON p.CODIGO_CURSO = b.CODIGO_CURSO
      LEFT JOIN feitas_por_classe f
        ON f.MATRICULA = b.MATRICULA
       AND f.CLASSE = p.CLASSE
    ),

    primeira_classe_pendente AS (
      SELECT
        MATRICULA,
        MIN(CLASSE) AS ANO_CURRICULAR
      FROM classes_avaliadas
      WHERE SUPEROU_METADE = 0
      GROUP BY MATRICULA
    ),

    ultima_classe AS (
      SELECT
        MATRICULA,
        MAX(CLASSE) AS ULTIMA_CLASSE
      FROM classes_avaliadas
      GROUP BY MATRICULA
    ),

    classe_final AS (
      SELECT
        u.MATRICULA,
        NVL(p.ANO_CURRICULAR, u.ULTIMA_CLASSE) AS ANO_CURRICULAR
      FROM ultima_classe u
      LEFT JOIN primeira_classe_pendente p
        ON p.MATRICULA = u.MATRICULA
    ),

    final_data AS (
      SELECT
        b.*,
        cf.ANO_CURRICULAR
      FROM base_estudantes b
      LEFT JOIN classe_final cf
        ON cf.MATRICULA = b.MATRICULA
      WHERE (
        cf.ANO_CURRICULAR = :anoCurricular_final
        OR :anoCurricular_final = 0
      )
        AND (
          :search_nome IS NULL
          OR UPPER(b.NOME) LIKE :search_nome
          OR UPPER(TO_CHAR(b.MATRICULA)) LIKE :search_matricula
          OR UPPER(NVL(b.CURSO, '-')) LIKE :search_curso
          OR UPPER(NVL(b.ESTADO, '-')) LIKE :search_estado
          OR UPPER(NVL(b.TELEFONE, '-')) LIKE :search_telefone
          OR UPPER(NVL(b.EMAIL, '-')) LIKE :search_email
        )
    )

    SELECT *
    FROM (
      SELECT
        f.*,
        ROW_NUMBER() OVER (ORDER BY f.NOME ASC) AS RN
      FROM final_data f
    ) t
    WHERE t.RN BETWEEN :offset_rows + 1 AND :offset_rows + :limit_rows
    ORDER BY t.RN
  `;

  const countSql = `
    WITH base_estudantes AS (
      SELECT DISTINCT
        tm.CODIGO AS MATRICULA,
        tm.CODIGO_CURSO AS CODIGO_CURSO,
        tp.NOME_COMPLETO AS NOME,
        tp.CONTACTOS_TELEFONICOS AS TELEFONE,
        tp.EMAIL AS EMAIL,
        tc.DESIGNACAO AS CURSO,
        tem.DESIGNACAO AS ESTADO
      FROM FK2_MGA_TB_SITUACAO_FINANCEIRA_ALUNO mtsfa
      INNER JOIN FK2_TB_ESTADO_MATRICULA tem
        ON tem.CODIGO = mtsfa.FK_TB_ESTADO_MATRICULA
      INNER JOIN FK2_TB_MATRICULAS tm
        ON tm.CODIGO = mtsfa.FK_MATRICULA
      INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
      INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        ON tgca.CODIGO_MATRICULA = tm.CODIGO
      WHERE tgca.CODIGO_ANO_LECTIVO = :anoLectivo_base
        AND tgca.CODIGO_STATUS_GRADE_CURRICULAR IN (1, 2, 3)
        AND (tc.CODIGO = :curso_base OR :curso_zero_base = 0)
        AND (
          tp.CODIGO_TURNO = :turno_base
          OR :turno_zero_base = 0
        )
        AND (tem.CODIGO = :estado_base OR :estado_zero_base = 0)
    ),

    plano_por_classe AS (
      SELECT
        tpcc.CODIGO_CURSO,
        tgc.CODIGO_CLASSE AS CLASSE,
        COUNT(tpcg.CODIGO_GRADE_CURRICULAR) AS QTD_PLANO
      FROM FK2_TB_PLANO_CURRICULAR_GRADE tpcg
      INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc
        ON tpcc.CODIGO = tpcg.CODIGO_PLANO_CURRICULAR_CURSO
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.CODIGO = tpcg.CODIGO_GRADE_CURRICULAR
      WHERE tpcc.CODIGO_ANO_LECTIVO = :anoLectivo_plano
      GROUP BY tpcc.CODIGO_CURSO, tgc.CODIGO_CLASSE
    ),

    feitas_por_classe AS (
      SELECT
        tgca.CODIGO_MATRICULA AS MATRICULA,
        tgc.CODIGO_CLASSE AS CLASSE,
        COUNT(tgca.CODIGO) AS QTD_FEITAS
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
      WHERE tgca.CODIGO_STATUS_GRADE_CURRICULAR = 3
      GROUP BY tgca.CODIGO_MATRICULA, tgc.CODIGO_CLASSE
    ),

    classes_avaliadas AS (
      SELECT
        b.MATRICULA,
        b.CODIGO_CURSO,
        p.CLASSE,
        p.QTD_PLANO,
        NVL(f.QTD_FEITAS, 0) AS QTD_FEITAS,
        CASE
          WHEN NVL(f.QTD_FEITAS, 0) > (p.QTD_PLANO / 2) THEN 1
          ELSE 0
        END AS SUPEROU_METADE
      FROM (SELECT DISTINCT MATRICULA, CODIGO_CURSO FROM base_estudantes) b
      INNER JOIN plano_por_classe p
        ON p.CODIGO_CURSO = b.CODIGO_CURSO
      LEFT JOIN feitas_por_classe f
        ON f.MATRICULA = b.MATRICULA
       AND f.CLASSE = p.CLASSE
    ),

    primeira_classe_pendente AS (
      SELECT
        MATRICULA,
        MIN(CLASSE) AS ANO_CURRICULAR
      FROM classes_avaliadas
      WHERE SUPEROU_METADE = 0
      GROUP BY MATRICULA
    ),

    ultima_classe AS (
      SELECT
        MATRICULA,
        MAX(CLASSE) AS ULTIMA_CLASSE
      FROM classes_avaliadas
      GROUP BY MATRICULA
    ),

    classe_final AS (
      SELECT
        u.MATRICULA,
        NVL(p.ANO_CURRICULAR, u.ULTIMA_CLASSE) AS ANO_CURRICULAR
      FROM ultima_classe u
      LEFT JOIN primeira_classe_pendente p
        ON p.MATRICULA = u.MATRICULA
    )

    SELECT COUNT(*) AS TOTAL
    FROM (
      SELECT DISTINCT b.MATRICULA
      FROM base_estudantes b
      LEFT JOIN classe_final cf
        ON cf.MATRICULA = b.MATRICULA
      WHERE (
        cf.ANO_CURRICULAR = :anoCurricular_final
        OR :anoCurricular_final = 0
      )
        AND (
          :search_nome IS NULL
          OR UPPER(b.NOME) LIKE :search_nome
          OR UPPER(TO_CHAR(b.MATRICULA)) LIKE :search_matricula
          OR UPPER(NVL(b.CURSO, '-')) LIKE :search_curso
          OR UPPER(NVL(b.ESTADO, '-')) LIKE :search_estado
          OR UPPER(NVL(b.TELEFONE, '-')) LIKE :search_telefone
          OR UPPER(NVL(b.EMAIL, '-')) LIKE :search_email
        )
    )
  `;

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
    telefone: row.TELEFONE,
    email: row.EMAIL,
    curso: row.CURSO,
    ano_curricular: row.ANO_CURRICULAR,
    estado: row.ESTADO,
    cor: row.COR,
  }));

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

async isentarColisaoMatricula(
  matricula: number,
  anoLectivo: number,
  user: any,
) {
  const exists = await this.dataSource.query(
    `
      SELECT 1
      FROM FK2_MGIM_TB_COLISAO_MATRICULA
      WHERE CODIGO_MATRICULA = :1
        AND CODIGO_ANOLECTIVO = :2
      FETCH FIRST 1 ROWS ONLY
    `,
    [matricula, anoLectivo],
  );

  if (exists.length > 0) {
    throw new BadRequestException(
      'O estudante já está isento da colisão para este ano lectivo.',
    );
  }

  await this.dataSource.query(
    `
      INSERT INTO FK2_MGIM_TB_COLISAO_MATRICULA
        (CODIGO_MATRICULA, REF_UTILIZADOR, DATA, CODIGO_ANOLECTIVO)
      VALUES
        (:1, :2, SYSDATE, :3)
    `,
    [matricula, JSON.stringify(user), anoLectivo],
  );

  return {
    message: 'Colisão aplicada por matrícula com sucesso.',
  };
}

async isentarColisaoCurso(
  curso: number,
  turno: number,
  anoLectivo: number,
  user: any,
) {
  const exists = await this.dataSource.query(
    `
      SELECT 1
      FROM FK2_MGIM_TB_COLISAO_CURSO
      WHERE CODIGO_CURSO = :1
        AND CODIGO_ANOLECTIVO = :2
      FETCH FIRST 1 ROWS ONLY
    `,
    [curso, anoLectivo],
  );

  if (exists.length > 0) {
    throw new BadRequestException(
      'Este curso já está isento da colisão para este ano lectivo.',
    );
  }

  await this.dataSource.query(
    `
      INSERT INTO FK2_MGIM_TB_COLISAO_CURSO
        (CODIGO_CURSO, CODIGO_TURNO, REF_UTILIZADOR, DATA, CODIGO_ANOLECTIVO)
      VALUES
        (:1, :2, :3, SYSDATE, :4)
    `,
    [curso, turno, JSON.stringify(user), anoLectivo],
  );

  return {
    message: 'Colisão aplicada por curso com sucesso.',
  };
}


async pesquisarEstudantesParaIsencao(filter: any) {
  const {
    page = 1,
    limit = 10,
    anoLectivo = 0,
    curso = 0,
    turno = 0,
    search = "",
  } = filter;

  const offset = (page - 1) * limit;
  const searchValue =
    search && String(search).trim()
      ? `%${String(search).trim().toUpperCase()}%`
      : null;

  const dataParams = [
    anoLectivo,   // :1
    anoLectivo,   // :2
    curso,        // :3
    curso,        // :4
    turno,        // :5
    turno,        // :6
    searchValue,  // :7
    searchValue,  // :8
    searchValue,  // :9
    offset,       // :10
    offset,       // :11
    limit,        // :12
  ];

  const countParams = [
    anoLectivo,   // :1
    anoLectivo,   // :2
    curso,        // :3
    curso,        // :4
    turno,        // :5
    turno,        // :6
    searchValue,  // :7
    searchValue,  // :8
    searchValue,  // :9
  ];

  const sql = `
    SELECT *
    FROM (
      SELECT
        tm.CODIGO AS MATRICULA,
        tp.NOME_COMPLETO AS NOME,
        tp.EMAIL AS EMAIL,
        tp.CONTACTOS_TELEFONICOS AS TELEFONE,
        tc.DESIGNACAO AS CURSO,
        tp.CODIGO_TURNO AS CODIGO_TURNO,
        ROW_NUMBER() OVER (ORDER BY tp.NOME_COMPLETO ASC) AS RN
      FROM FK2_TB_MATRICULAS tm
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
      INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
      WHERE (tp.ANOLECTIVO = :1 OR :2 = 0)
        AND (tc.CODIGO = :3 OR :4 = 0)
        AND (tp.CODIGO_TURNO = :5 OR :6 = 0)
        AND (
          :7 IS NULL
          OR UPPER(tp.NOME_COMPLETO) LIKE :8
          OR UPPER(TO_CHAR(tm.CODIGO)) LIKE :9
        )
    ) t
    WHERE t.RN BETWEEN :10 + 1 AND :11 + :12
    ORDER BY t.RN
  `;

  const countSql = `
    SELECT COUNT(*) AS TOTAL
    FROM (
      SELECT DISTINCT tm.CODIGO
      FROM FK2_TB_MATRICULAS tm
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
      INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
      WHERE (tp.ANOLECTIVO = :1 OR :2 = 0)
        AND (tc.CODIGO = :3 OR :4 = 0)
        AND (tp.CODIGO_TURNO = :5 OR :6 = 0)
        AND (
          :7 IS NULL
          OR UPPER(tp.NOME_COMPLETO) LIKE :8
          OR UPPER(TO_CHAR(tm.CODIGO)) LIKE :9
        )
    )
  `;

  const [result, countResult] = await Promise.all([
    this.dataSource.query(sql, dataParams),
    this.dataSource.query(countSql, countParams),
  ]);

  const total = Number(countResult[0]?.TOTAL ?? 0);

  const data = result.map((row: any) => ({
    matricula: row.MATRICULA,
    nome: row.NOME,
    email: row.EMAIL,
    telefone: row.TELEFONE,
    curso: row.CURSO,
    codigo_turno: row.CODIGO_TURNO,
  }));

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}


async listarColisoesIsentasPorMatricula(filter: any) {
  const {
    page = 1,
    limit = 10,
    anoLectivo = 0,
    search = "",
  } = filter;

  const offset = (page - 1) * limit;
  const searchValue =
    search && String(search).trim()
      ? `%${String(search).trim().toUpperCase()}%`
      : null;

  const dataParams = [
    anoLectivo,   // :1
    anoLectivo,   // :2
    searchValue,  // :3
    searchValue,  // :4
    searchValue,  // :5
    offset,       // :6
    offset,       // :7
    limit,        // :8
  ];

  const countParams = [
    anoLectivo,   // :1
    anoLectivo,   // :2
    searchValue,  // :3
    searchValue,  // :4
    searchValue,  // :5
  ];

  const sql = `
    SELECT *
    FROM (
      SELECT
        cm.CODIGO,
        tm.CODIGO AS MATRICULA,
        tp.NOME_COMPLETO AS NOME,
        al.DESIGNACAO AS ANO_LECTIVO,
        cm.DATA,
        cm.REF_UTILIZADOR,
        ROW_NUMBER() OVER (ORDER BY cm.DATA DESC, tp.NOME_COMPLETO ASC) AS RN
      FROM FK2_MGIM_TB_COLISAO_MATRICULA cm
      INNER JOIN FK2_TB_MATRICULAS tm
        ON tm.CODIGO = cm.CODIGO_MATRICULA
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
      INNER JOIN FK2_TB_ANO_LECTIVO al
        ON al.CODIGO = cm.CODIGO_ANOLECTIVO
      WHERE (cm.CODIGO_ANOLECTIVO = :1 OR :2 = 0)
        AND (
          :3 IS NULL
          OR UPPER(tp.NOME_COMPLETO) LIKE :4
          OR UPPER(TO_CHAR(tm.CODIGO)) LIKE :5
        )
    ) t
    WHERE t.RN BETWEEN :6 + 1 AND :7 + :8
    ORDER BY t.RN
  `;

  const countSql = `
    SELECT COUNT(*) AS TOTAL
    FROM (
      SELECT cm.CODIGO
      FROM FK2_MGIM_TB_COLISAO_MATRICULA cm
      INNER JOIN FK2_TB_MATRICULAS tm
        ON tm.CODIGO = cm.CODIGO_MATRICULA
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
      WHERE (cm.CODIGO_ANOLECTIVO = :1 OR :2 = 0)
        AND (
          :3 IS NULL
          OR UPPER(tp.NOME_COMPLETO) LIKE :4
          OR UPPER(TO_CHAR(tm.CODIGO)) LIKE :5
        )
    )
  `;

  const [result, countResult] = await Promise.all([
    this.dataSource.query(sql, dataParams),
    this.dataSource.query(countSql, countParams),
  ]);

  const total = Number(countResult[0]?.TOTAL ?? 0);

  const data = result.map((row: any, index: number) => ({
    numero: offset + index + 1,
    codigo: row.CODIGO,
    matricula: row.MATRICULA,
    nome: row.NOME,
    ano_lectivo: row.ANO_LECTIVO,
    data: row.DATA,
    ref_utilizador: row.REF_UTILIZADOR,
  }));

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

async listarColisoesIsentasPorCurso(filter: any) {
  const {
    page = 1,
    limit = 10,
    anoLectivo = 0,
    curso = 0,
    turno = 0,
  } = filter;

  const offset = (page - 1) * limit;

  const dataParams = [
    anoLectivo, // :1
    anoLectivo, // :2
    curso,      // :3
    curso,      // :4
    turno,      // :5
    turno,      // :6
    offset,     // :7
    offset,     // :8
    limit,      // :9
  ];

  const countParams = [
    anoLectivo, // :1
    anoLectivo, // :2
    curso,      // :3
    curso,      // :4
    turno,      // :5
    turno,      // :6
  ];

  const sql = `
    SELECT *
    FROM (
      SELECT
        cc.CODIGO,
        tc.CODIGO AS CODIGO_CURSO,
        tc.DESIGNACAO AS CURSO,
        tp.CODIGO AS CODIGO_TURNO,
        tp.DESIGNACAO AS TURNO,
        al.DESIGNACAO AS ANO_LECTIVO,
        cc.DATA,
        cc.REF_UTILIZADOR,
        ROW_NUMBER() OVER (ORDER BY cc.DATA DESC, tc.DESIGNACAO ASC) AS RN
      FROM FK2_MGIM_TB_COLISAO_CURSO cc
      INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = cc.CODIGO_CURSO
      INNER JOIN FK2_TB_PERIODOS tp
        ON tp.CODIGO = cc.CODIGO_TURNO
      INNER JOIN FK2_TB_ANO_LECTIVO al
        ON al.CODIGO = cc.CODIGO_ANOLECTIVO
      WHERE (cc.CODIGO_ANOLECTIVO = :1 OR :2 = 0)
        AND (cc.CODIGO_CURSO = :3 OR :4 = 0)
        AND (cc.CODIGO_TURNO = :5 OR :6 = 0)
    ) t
    WHERE t.RN BETWEEN :7 + 1 AND :8 + :9
    ORDER BY t.RN
  `;

  const countSql = `
    SELECT COUNT(*) AS TOTAL
    FROM (
      SELECT cc.CODIGO
      FROM FK2_MGIM_TB_COLISAO_CURSO cc
      WHERE (cc.CODIGO_ANOLECTIVO = :1 OR :2 = 0)
        AND (cc.CODIGO_CURSO = :3 OR :4 = 0)
        AND (cc.CODIGO_TURNO = :5 OR :6 = 0)
    )
  `;

  const [result, countResult] = await Promise.all([
    this.dataSource.query(sql, dataParams),
    this.dataSource.query(countSql, countParams),
  ]);

  const total = Number(countResult[0]?.TOTAL ?? 0);

  const data = result.map((row: any, index: number) => ({
    numero: offset + index + 1,
    codigo: row.CODIGO,
    codigo_curso: row.CODIGO_CURSO,
    curso: row.CURSO,
    codigo_turno: row.CODIGO_TURNO,
    turno: row.TURNO,
    ano_lectivo: row.ANO_LECTIVO,
    data: row.DATA,
    ref_utilizador: row.REF_UTILIZADOR,
  }));

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}






}
