import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindStudentsDTO } from './dto/find-students.dto';
import { FilterMapaAnualFinalistasDto } from './dto/filter-mapa-anual-finalista.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly dataSource: DataSource) {}

  async getProfileEstatistic(codigoMatricula: number): Promise<any> {
    const sql = `
      SELECT
    m.codigo               AS codigo_matricula,
    p.BILHETE_IDENTIDADE   AS bi,
    c.designacao           AS curso,
    pe.DESIGNACAO          AS periodo,
    m.ESTADO_MATRICULA     AS estado,
    p.Nome_Completo        AS nome_completo,
    p.Bilhete_Identidade   AS bi_aluno,
    p.Email                AS email,
    p.Contactos_Telefonicos AS telefonicos,
    p.Data_Nascimento      AS data_nascimento,
    p.PAI                  AS pai,
    p.MAE                  AS mae,
    p.NATURALIDADE         AS naturalidade,
    nac.DESIGNACAO         AS nacionalidade,
    p.ESTADO_CIVIL         AS estado_civil,
    p.SEXO                 AS sexo,
    fac.DESIGNACAO         AS faculdade,
    tpc.DESIGNACAO         AS grau,
    pr.DESIGNACAO          AS regime,
    p.MORADA_COMPLETA      AS morada,
    p.SALDO_RESET       AS saldo_atual,
    p.SALDO_RESET_ANTER AS saldo_anterior,
    u.FOTO                 AS foto
FROM FK2_TB_MATRICULAS m
INNER JOIN FK2_TB_ADMISSAO a
    ON a.codigo = m.CODIGO_ALUNO
INNER JOIN FK2_TB_PREINSCRICAO p
    ON p.codigo = a.PRE_INCRICAO
INNER JOIN FK2_USERS u
    ON u.ID = p.USER_ID
INNER JOIN FK2_TB_CURSOS c
    ON c.codigo = m.CODIGO_CURSO
INNER JOIN FK2_TB_FACULDADE fac
    ON fac.codigo = c.FACULDADE_ID
INNER JOIN FK2_TB_PERIODOS pe
    ON pe.codigo = p.CODIGO_TURNO
INNER JOIN FK2_TB_NACIONALIDADES nac
    ON nac.CODIGO = p.CODIGO_NACIONALIDADE
INNER JOIN FK2_TB_TIPO_CANDIDATURA tpc
    ON tpc.ID = p.CODIGO_TIPO_CANDIDATURA
INNER JOIN FK2_TB_PERIODOS pr
    ON pr.CODIGO = p.CODIGO_TURNO
WHERE m.codigo = :codigoMatricula

    `;

    const result = await this.dataSource.query(sql, {
      codigoMatricula,
    } as any);

    return toLowerCaseKeys(result[0]) || null;
  }

  async getSugestoes(search: string): Promise<any[]> {
    if (!search || search.trim().length < 2) {
      return [];
    }

    const sql = `
    SELECT
        m.codigo               AS codigo_matricula,
        p.BILHETE_IDENTIDADE   AS bi,
        c.designacao           AS curso,
        pe.DESIGNACAO          AS periodo,
         p.Nome_Completo              AS nome_completo,
        m.ESTADO_MATRICULA     AS estado
    FROM FK2_TB_MATRICULAS m
    INNER JOIN FK2_TB_ADMISSAO      a  ON a.codigo  = m.CODIGO_ALUNO
     INNER JOIN FK2_TB_PREINSCRICAO p
             ON p.Codigo = a.pre_incricao
    INNER JOIN FK2_TB_PREINSCRICAO  p  ON p.codigo  = a.PRE_INCRICAO
    INNER JOIN FK2_TB_CURSOS        c  ON c.codigo  = m.CODIGO_CURSO
    INNER JOIN FK2_TB_PERIODOS      pe ON pe.codigo = p.CODIGO_TURNO
    WHERE
        TO_CHAR(m.codigo)         LIKE :search
       OR p.BILHETE_IDENTIDADE      LIKE :search
       OR LOWER(c.designacao)       LIKE LOWER(:search)
       OR  LOWER(p.Nome_Completo)          LIKE LOWER(:search)


    FETCH FIRST 10 ROWS ONLY
  `;
    const result = await this.dataSource.query(sql, {
      search: `%${search}%`,
    } as any);
    return toLowerCaseKeys(result);
  }

  async findStudents(filters: FindStudentsDTO) {
    const {
      anoLectivo,
      codigoCurso,
      faculdadeId,
      codigoMatricula,
      limit = 25,
      page = 1,
    } = filters;

    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any = {};

    conditions.push(`
    EXISTS (
      SELECT 1
      FROM FK2_TB_CONFIRMACOES con
      WHERE con.CODIGO_MATRICULA = m.codigo
      AND con.CODIGO_ANO_LECTIVO = :anoLectivo
    )
  `);
    params.anoLectivo = anoLectivo;

    if (codigoCurso) {
      conditions.push(`c.codigo = :codigoCurso`);
      params.codigoCurso = codigoCurso;
    }

    if (faculdadeId) {
      conditions.push(`c.FACULDADE_ID = :faculdadeId`);
      params.faculdadeId = faculdadeId;
    }

    if (codigoMatricula) {
      conditions.push(`m.codigo = :codigoMatricula`);
      params.codigoMatricula = codigoMatricula;
    }

    const whereClause = conditions.length ? conditions.join(' AND ') : '1=1';

    const sql = `
    SELECT
      m.codigo               AS codigo_matricula,
      p.NOME_COMPLETO        AS nome_completo,
      p.BILHETE_IDENTIDADE   AS bi,
      c.designacao           AS curso,
      ca.DESIGNACAO          AS candidatura
    FROM FK2_TB_MATRICULAS m
    INNER JOIN FK2_TB_CURSOS c
      ON c.codigo = m.CODIGO_CURSO
    INNER JOIN FK2_TB_ADMISSAO a
      ON a.codigo = m.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO p
      ON p.codigo = a.PRE_INCRICAO
    INNER JOIN FK2_TB_TIPO_CANDIDATURA ca
      ON ca.ID = c.TIPO_CANDIDATURA
    WHERE ${whereClause}
    ORDER BY m.codigo DESC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;

    const sqlParams = {
      ...params,
      offset,
      limit,
    };

    const sqlCount = `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_TB_MATRICULAS m
    INNER JOIN FK2_TB_CURSOS c
      ON c.codigo = m.CODIGO_CURSO
    INNER JOIN FK2_TB_ADMISSAO a
      ON a.codigo = m.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO p
      ON p.codigo = a.PRE_INCRICAO
    INNER JOIN FK2_TB_TIPO_CANDIDATURA ca
      ON ca.ID = c.TIPO_CANDIDATURA
    WHERE ${whereClause}
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

  async listarMapaAnualFinalistas(filter: FilterMapaAnualFinalistasDto) {
  const {
    page = 1,
    limit = 10,
    anoLectivo = 0,
    grau = 0,
    search,
  } = filter;

  const offset = (page - 1) * limit;

  const baseParams: Record<string, any> = {
    anoLectivo,
    anoLectivo_zero: anoLectivo,
    grau,
    grau_zero: grau,
  };

  let whereClause = `
    WHERE (tcf.CODIGO_ANO_LECTIVO = :anoLectivo OR :anoLectivo_zero = 0)
      AND (ttc.ID = :grau OR :grau_zero = 0)
  `;

  if (search && search.trim()) {
    whereClause += `
      AND (
        UPPER(tp.NOME_COMPLETO) LIKE :search
        OR UPPER(NVL(tp.BILHETE_IDENTIDADE, '-')) LIKE :search
      )
    `;
    baseParams.search = `%${search.trim().toUpperCase()}%`;
  }

  const baseFrom = `
    FROM FK2_TB_MATRICULAS tm
    INNER JOIN FK2_TB_ADMISSAO ta
      ON ta.CODIGO = tm.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO tp
      ON tp.CODIGO = ta.PRE_INCRICAO
    INNER JOIN FK2_TB_TIPO_CANDIDATURA ttc
      ON ttc.ID = tp.CODIGO_TIPO_CANDIDATURA
    INNER JOIN FK2_TB_CONFIRMACOES tcf
      ON tcf.CODIGO_MATRICULA = tm.CODIGO
    INNER JOIN FK2_TB_CURSOS tc
      ON tc.CODIGO = tm.CODIGO_CURSO
    INNER JOIN FK2_TB_FACULDADE tf
      ON tf.CODIGO = tc.FACULDADE_ID
    LEFT JOIN FK2_TB_PROVINCIAS tpr
      ON tpr.CODIGO = tp.CODIGO_PROVINCIA_RESIDENCIA_PERMANENTE
    LEFT JOIN FK2_TB_MUNICIPIOS tm2
      ON tm2.CODIGO = tp.CODIGO_MUNICIPIO
    LEFT JOIN FK2_TB_NACIONALIDADES tn
      ON tn.CODIGO = tp.CODIGO_NACIONALIDADE
  `;

  const sql = `
    SELECT *
    FROM (
      SELECT
        q.*,
        ROW_NUMBER() OVER (ORDER BY q.NOME ASC) AS RN
      FROM (
        SELECT DISTINCT
          tp.NOME_COMPLETO AS NOME,
          tp.BILHETE_IDENTIDADE AS NUM_BILHETE,
          tp.SEXO AS GENERO,
          EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM tp.DATA_NASCIMENTO) AS IDADE,
          tp.DATA_NASCIMENTO AS DATA_NASCIMENTO,
          tpr.DESIGNACAO AS PROVINCIA,
          tm2.DESIGNACAO AS MUNICIPIO,
          tn.DESIGNACAO AS PAIS_ORIGEM,
          CASE
            WHEN tp.CODIGO_TURNO = 5 THEN 'Regular'
            ELSE 'Pós-Laboral'
          END AS PERIODO_ESTUDO,
          tf.DESIGNACAO AS UNIDADE_ORGANICA,
          tc.DESIGNACAO AS CURSO,
          EXTRACT(YEAR FROM tm.DATA_MATRICULA) AS ANO_PRIMEIRA_MATRICULA,
          'N/A' AS TRABALHADOR,
          tc.DURACAO AS DURACAO_CURSO,
          ROUND((
            SELECT SUM(tgca2.NOTA)
            FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca2
            INNER JOIN FK2_TB_GRADE_CURRICULAR tgc2
              ON tgc2.CODIGO = tgca2.CODIGO_GRADE_CURRICULAR
            WHERE tgca2.CODIGO_MATRICULA = tm.CODIGO
              AND tgca2.CODIGO_STATUS_GRADE_CURRICULAR = 3
              AND tgc2.STATUS_ NOT IN (0, 3)
              AND tm.CODIGO_CURSO = tgc2.CODIGO_CURSO
          ) / NULLIF((
            SELECT COUNT(tgca3.CODIGO_GRADE_CURRICULAR)
            FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca3
            INNER JOIN FK2_TB_GRADE_CURRICULAR tgc3
              ON tgc3.CODIGO = tgca3.CODIGO_GRADE_CURRICULAR
            WHERE tgca3.CODIGO_MATRICULA = tm.CODIGO
              AND tgca3.CODIGO_STATUS_GRADE_CURRICULAR = 3
              AND tgc3.STATUS_ NOT IN (0, 3)
              AND tm.CODIGO_CURSO = tgc3.CODIGO_CURSO
          ), 0), 0) AS MEDIA_FINAL,

          (
            (
              SELECT COUNT(tpcg.CODIGO_GRADE_CURRICULAR)
              FROM FK2_TB_PLANO_CURRICULAR_GRADE tpcg
              INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc
                ON tpcg.CODIGO_PLANO_CURRICULAR_CURSO = tpcc.CODIGO
              WHERE tpcc.CODIGO_CURSO = tm.CODIGO_CURSO
                AND tpcc.CODIGO_ANO_LECTIVO = :anoLectivo
            ) +
            (
              SELECT COUNT(tpcg2.CODIGO_GRADE_CURRICULAR)
              FROM FK2_TB_PLANO_CURRICULAR_GRADE tpcg2
              INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc2
                ON tpcg2.CODIGO_PLANO_CURRICULAR_CURSO = tpcc2.CODIGO
              INNER JOIN FK2_TB_PREINSCRICAO tp2
                ON tp2.CODIGO = ta.PRE_INCRICAO
              WHERE tpcc2.CODIGO_CURSO = tp2.CURSO_CANDIDATURA
                AND tpcc2.CODIGO_ANO_LECTIVO = :anoLectivo
                AND tp2.CURSO_CANDIDATURA != tm.CODIGO_CURSO
            )
          ) AS QTD_CADEIRAS_CURSO,

          (
            SELECT COUNT(tgca4.CODIGO_GRADE_CURRICULAR)
            FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca4
            INNER JOIN FK2_TB_GRADE_CURRICULAR tgc4
              ON tgc4.CODIGO = tgca4.CODIGO_GRADE_CURRICULAR
            WHERE tgca4.CODIGO_MATRICULA = tm.CODIGO
              AND tgca4.CODIGO_STATUS_GRADE_CURRICULAR = 3
              AND tgc4.STATUS_ NOT IN (0, 3)
              AND tm.CODIGO_CURSO = tgc4.CODIGO_CURSO
          ) AS QTD_CADEIRAS_CONCLUIDAS

        ${baseFrom}
        ${whereClause}
      ) q
      WHERE (q.QTD_CADEIRAS_CURSO - q.QTD_CADEIRAS_CONCLUIDAS) = 1
    ) t
    WHERE t.RN BETWEEN :offset + 1 AND :offset + :limit
    ORDER BY t.RN
  `;

  const countSql = `
    SELECT COUNT(*) AS TOTAL
    FROM (
      SELECT DISTINCT
        tp.NOME_COMPLETO AS NOME,
        tp.BILHETE_IDENTIDADE AS NUM_BILHETE,
        (
          (
            SELECT COUNT(tpcg.CODIGO_GRADE_CURRICULAR)
            FROM FK2_TB_PLANO_CURRICULAR_GRADE tpcg
            INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc
              ON tpcg.CODIGO_PLANO_CURRICULAR_CURSO = tpcc.CODIGO
            WHERE tpcc.CODIGO_CURSO = tm.CODIGO_CURSO
              AND tpcc.CODIGO_ANO_LECTIVO = :anoLectivo
          ) +
          (
            SELECT COUNT(tpcg2.CODIGO_GRADE_CURRICULAR)
            FROM FK2_TB_PLANO_CURRICULAR_GRADE tpcg2
            INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc2
              ON tpcg2.CODIGO_PLANO_CURRICULAR_CURSO = tpcc2.CODIGO
            INNER JOIN FK2_TB_PREINSCRICAO tp2
              ON tp2.CODIGO = ta.PRE_INCRICAO
            WHERE tpcc2.CODIGO_CURSO = tp2.CURSO_CANDIDATURA
              AND tpcc2.CODIGO_ANO_LECTIVO = :anoLectivo
              AND tp2.CURSO_CANDIDATURA != tm.CODIGO_CURSO
          )
        ) AS QTD_CADEIRAS_CURSO,
        (
          SELECT COUNT(tgca4.CODIGO_GRADE_CURRICULAR)
          FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca4
          INNER JOIN FK2_TB_GRADE_CURRICULAR tgc4
            ON tgc4.CODIGO = tgca4.CODIGO_GRADE_CURRICULAR
          WHERE tgca4.CODIGO_MATRICULA = tm.CODIGO
            AND tgca4.CODIGO_STATUS_GRADE_CURRICULAR = 3
            AND tgc4.STATUS_ NOT IN (0, 3)
            AND tm.CODIGO_CURSO = tgc4.CODIGO_CURSO
        ) AS QTD_CADEIRAS_CONCLUIDAS
      ${baseFrom}
      ${whereClause}
    ) x
    WHERE (x.QTD_CADEIRAS_CURSO - x.QTD_CADEIRAS_CONCLUIDAS) = 1
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
    nome: row.NOME,
    numero_bilhete: row.NUM_BILHETE,
    genero: row.GENERO,
    idade: row.IDADE,
    data_nascimento: row.DATA_NASCIMENTO, 
    provincia: row.PROVINCIA,
    municipio: row.MUNICIPIO,
    pais_origem: row.PAIS_ORIGEM,
    periodo_estudo: row.PERIODO_ESTUDO,
    unidade_organica: row.UNIDADE_ORGANICA,
    curso: row.CURSO,
    ano_primeira_matricula: row.ANO_PRIMEIRA_MATRICULA,
    trabalhador: row.TRABALHADOR,
    duracao_curso: row.DURACAO_CURSO,
    media_final: row.MEDIA_FINAL,
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
