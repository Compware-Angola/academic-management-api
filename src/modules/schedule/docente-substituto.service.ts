// docente-substituto.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as oracledb from 'oracledb';

import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { ListDocenteSubstitutoDto } from './dto/list-docente-substituto.dto';
import { CreateDocenteSubstitutoDto } from './dto/create-docente-substituto.dto';

@Injectable()
export class DocenteSubstitutoService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ==================== CREATE ====================
  async create(
    userId: number = 1,
    dto: CreateDocenteSubstitutoDto,
  ): Promise<any> {
    const { fkDocenteOriginal, fkDocenteSubstituto, fkHorario, dataInicio, dataTermino, obs = null } = dto;

    const result = await this.dataSource.query(
      `
      INSERT INTO CMPDEV.MGH_TB_AULA_DOCENTE_SUBSTITUTO (
        FK_DOCENTE_ORIGINAL,
        FK_DOCENTE_SUBSTITUTO,
        FK_HORARIO,
        DATA_INICIO,
        DATA_TERMINO,
        OBS,
        CREATED_BY,
        LAST_UPDATED_BY,
        CREATED_AT,
        UPDATED_AT,
        ACTIVE_STATE
      ) VALUES (
        :fkDocenteOriginal,
        :fkDocenteSubstituto,
        :fkHorario,
        TO_DATE(:dataInicio, 'YYYY-MM-DD'),
        TO_DATE(:dataTermino, 'YYYY-MM-DD'),
        :obs,
        :userId,
        :userId,
        SYSDATE,
        SYSDATE,
        1
      ) RETURNING PK_AULA_DOCENTE_SUBSTITUTO INTO :outId
      `,
      {
        fkDocenteOriginal,
        fkDocenteSubstituto,
        fkHorario,
        dataInicio,
        dataTermino: dataTermino || null,
        obs,
        userId,
        outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      } as any,
    );

    return {
      success: true,
      message: 'Docente substituto criado com sucesso!',
      id: result.outId[0],
    };
  }

async findAll(filters: ListDocenteSubstitutoDto): Promise<any> {
  const {
    anoLectivo,
    semestre,
    periodo,
    curso,
    anoCurricular,
    unidadeCurricular,
    fkDocenteOriginal,
    fkDocenteSubstituto,
    fkHorario,
    dataInicio,
    dataTermino,
    page = 1,
    limit = 25,
  } = filters;

  if (!anoLectivo) {
    throw new BadRequestException('O campo anoLectivo é obrigatório');
  }

  const offset = (page - 1) * limit;

  const params: any = {
    anoLectivo,
    offset,
    limit: offset + limit,
  };

  let sql = `
    SELECT *
    FROM (
      SELECT
        dados.*,
        ROW_NUMBER() OVER (ORDER BY dados."DATACRIACAO" DESC) AS rn,
        COUNT(*) OVER () AS total_registros
      FROM (
        SELECT DISTINCT
          s."PK_AULA_DOCENTE_SUBSTITUTO"                              AS "CODIGO",

          -- Docente original (nome e pk vêm do JSON REF_DOCENTE da aula)
          s."FK_DOCENTE_ORIGINAL"                                     AS "FKDOCENTEORIGINAL",
          json_value(a."REF_DOCENTE", '$.pkDocente')                  AS "PKDOCENTEORIGINAL",
          json_value(a."REF_DOCENTE", '$.nome')                       AS "NOMEDOCENTEORIGINAL",

          -- Docente substituto (nome vem de FK2_MGD_TB_DOCENTE via JSON_VALUE)
          s."FK_DOCENTE_SUBSTITUTO"                                   AS "FKDOCENTESUBSTITUTO",
          JSON_VALUE(doc_sub."CODIGO_UTILIZADOR", '$.desc')           AS "NOMEDOCENTESUBSTITUTO",

          -- Horário / Aula
          s."FK_HORARIO"                                              AS "FKHORARIO",
          h."DESIGNACAO"                                              AS "DESIGNACAOHORARIO",
          a."HORA_INICIO"                                             AS "HORAINICIO",
          a."HORA_TERMINO"                                            AS "HORATERMINO",
          a."FK_DIA_DA_SEMANA"                                        AS "DIASEMANA",
             json_value(a.REF_AULA, '$.pk')                      AS "CODIGOSALA",
      json_value(a.REF_SALA, '$.desc')                    AS "DESCRICAOSALA",

          -- Grade / Unidade Curricular
          d."DESIGNACAO"                                              AS "UNIDADECURRICULAR",
          c."SIGLA"                                                   AS "CURSO",
          cl."DESIGNACAO"                                             AS "ANOCURRICULAR",
          h."FK_SEMESTRE"                                             AS "SEMESTRE",

          -- Período da substituição
          TO_CHAR(s."DATA_INICIO", 'DD/MM/YYYY')                      AS "DATAINICIO",
          TO_CHAR(s."DATA_TERMINO", 'DD/MM/YYYY')                     AS "DATATERMINO",

          -- Extra
          s."OBS"                                                     AS "OBS",
          s."ACTIVE_STATE"                                            AS "ACTIVESTATE",

          -- Auditoria
          NVL(ut."NOME", TO_CHAR(s."CREATED_BY"))                     AS "CRIADOPOR",
          TO_CHAR(s."CREATED_AT", 'DD/MM/YYYY HH24:MI')               AS "DATACRIACAO",
          TO_CHAR(s."UPDATED_AT", 'DD/MM/YYYY HH24:MI')               AS "DATAATUALIZACAO"

        FROM MGH_TB_AULA_DOCENTE_SUBSTITUTO s

        LEFT JOIN "FK2_MGH_TB_AULA" a
          ON a."PK_AULA" = s."FK_HORARIO"

        LEFT JOIN "FK2_MGH_TB_HORARIO" h
          ON h."PK_HORARIO" = a."FK_HORARIO"

        LEFT JOIN "FK2_TB_GRADE_CURRICULAR" g
          ON TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", '')) = g."CODIGO"

        LEFT JOIN "FK2_TB_DISCIPLINAS" d
          ON g."CODIGO_DISCIPLINA" = d."CODIGO"

        LEFT JOIN "FK2_TB_CURSOS" c
          ON g."CODIGO_CURSO" = c."CODIGO"

        LEFT JOIN "FK2_TB_CLASSES" cl
          ON g."CODIGO_CLASSE" = cl."CODIGO"

        -- Docente substituto via tabela de docentes
        LEFT JOIN "FK2_MGD_TB_DOCENTE" doc_sub
          ON doc_sub."CODIGO" = s."FK_DOCENTE_SUBSTITUTO"

        -- Utilizador que criou o registo
        LEFT JOIN "FK2_MCA_TB_UTILIZADOR" ut
          ON ut."PK_UTILIZADOR" = s."CREATED_BY"

        WHERE s."ACTIVE_STATE" = 1
          AND TO_NUMBER(NULLIF(h."FK_ANO_LECTIVO", '')) = :anoLectivo
  `;

  // ===== FILTROS OPCIONAIS =====

  if (semestre != null) {
    sql += ` AND TO_NUMBER(NULLIF(h."FK_SEMESTRE", '')) = :semestre`;
    params.semestre = semestre;
  }

  if (periodo != null) {
    sql += ` AND TO_NUMBER(NULLIF(h."FK_PERIODO", '')) = :periodo`;
    params.periodo = periodo;
  }

  if (unidadeCurricular != null) {
    sql += ` AND h."FK_GRADE_CURRICULAR" = :unidadeCurricular`;
    params.unidadeCurricular = unidadeCurricular;
  }

  if (anoCurricular != null) {
    sql += ` AND g."CODIGO_CLASSE" = :anoCurricular`;
    params.anoCurricular = anoCurricular;
  }

  if (curso != null) {
    sql += `
      AND (
        (
          (SELECT curs."GRAU" FROM "FK2_TB_CURSOS" curs
           WHERE curs."CODIGO" = :curso AND curs."STATUS_" = 1) = '0'
          AND g."FK_DEPARTAMENTO" = :curso
        )
        OR
        (
          (SELECT curs."GRAU" FROM "FK2_TB_CURSOS" curs
           WHERE curs."CODIGO" = :curso AND curs."STATUS_" = 1) != '0'
          AND g."CODIGO_CURSO" = :curso
        )
      )
    `;
    params.curso = curso;
  }

  // Filtro docente original via JSON do REF_DOCENTE da aula
  if (fkDocenteOriginal != null) {
    sql += ` AND TO_NUMBER(json_value(a."REF_DOCENTE", '$.pkDocente')) = :fkDocenteOriginal`;
    params.fkDocenteOriginal = fkDocenteOriginal;
  }

  // Filtro docente substituto via FK directa na tabela de docentes
  if (fkDocenteSubstituto != null) {
    sql += ` AND s."FK_DOCENTE_SUBSTITUTO" = :fkDocenteSubstituto`;
    params.fkDocenteSubstituto = fkDocenteSubstituto;
  }

  if (fkHorario != null) {
    sql += ` AND s."FK_HORARIO" = :fkHorario`;
    params.fkHorario = fkHorario;
  }

  // Filtro por período da substituição
  if (dataInicio != null) {
    sql += ` AND s."DATA_INICIO" >= TO_DATE(:dataInicio, 'YYYY-MM-DD')`;
    params.dataInicio = dataInicio;
  }

  if (dataTermino != null) {
    sql += ` AND s."DATA_TERMINO" <= TO_DATE(:dataTermino, 'YYYY-MM-DD')`;
    params.dataTermino = dataTermino;
  }

  // ===== FECHO DA QUERY =====
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
    totalPages: Math.ceil(total / limit),
  };
}

  // ==================== FIND ONE ====================
async findOne(id: number): Promise<any> {
  const rows = await this.dataSource.query(
    `
    SELECT
      s.PK_AULA_DOCENTE_SUBSTITUTO                         AS "CODIGO",

      -- Docente original (via JSON REF_DOCENTE da aula)
      s.FK_DOCENTE_ORIGINAL                                AS "FKDOCENTEORIGINAL",
      json_value(a.REF_DOCENTE, '$.pkDocente')             AS "PKDOCENTEORIGINAL",
      json_value(a.REF_DOCENTE, '$.nome')                  AS "NOMEDOCENTEORIGINAL",

      -- Docente substituto (via FK2_MGD_TB_DOCENTE)
      s.FK_DOCENTE_SUBSTITUTO                              AS "FKDOCENTESUBSTITUTO",
      JSON_VALUE(doc_sub.CODIGO_UTILIZADOR, '$.desc')      AS "NOMEDOCENTESUBSTITUTO",

      -- Aula
      s.FK_HORARIO                                         AS "FKHORARIO",
      a.HORA_INICIO                                        AS "HORAINICIO",
      a.HORA_TERMINO                                       AS "HORATERMINO",
      a.FK_DIA_DA_SEMANA                                   AS "DIASEMANA",
  
   
      json_value(a.REF_AULA, '$.pk')                      AS "CODIGOSALA",
      json_value(a.REF_SALA, '$.desc')                    AS "DESCRICAOSALA",

      -- Horário
      h.PK_HORARIO                                         AS "PKHORARIO",
      h.DESIGNACAO                                         AS "DESIGNACAOHORARIO",
      h.FK_SEMESTRE                                        AS "SEMESTRE",
      h.CAPACIDADE                                         AS "CAPACIDADE",

      -- Ano Lectivo
      al.CODIGO                                            AS "FKANOLETIVO",
      al.DESIGNACAO                                        AS "ANOLETIVO",

      -- Grade / Unidade Curricular
      g.CODIGO                                             AS "FKGRADECURRICULAR",
      d.DESIGNACAO                                         AS "UNIDADECURRICULAR",
      c.SIGLA                                              AS "CURSO",
      c.DESIGNACAO                                         AS "CURSODESIGNACAO",
      cl.DESIGNACAO                                        AS "ANOCURRICULAR",

      -- Período da substituição
      TO_CHAR(s.DATA_INICIO, 'DD/MM/YYYY')                 AS "DATAINICIO",
      TO_CHAR(s.DATA_TERMINO, 'DD/MM/YYYY')                AS "DATATERMINO",

      -- Extra
      s.OBS                                                AS "OBS",
      s.ACTIVE_STATE                                       AS "ACTIVESTATE",

      -- Auditoria
      NVL(ut.NOME, TO_CHAR(s.CREATED_BY))                  AS "CRIADOPOR",
      TO_CHAR(s.CREATED_AT, 'DD/MM/YYYY HH24:MI')          AS "DATACRIACAO",
      TO_CHAR(s.UPDATED_AT, 'DD/MM/YYYY HH24:MI')          AS "DATAATUALIZACAO"

    FROM CMPDEV.MGH_TB_AULA_DOCENTE_SUBSTITUTO s

    -- Aula
    LEFT JOIN FK2_MGH_TB_AULA a
      ON a.PK_AULA = s.FK_HORARIO

    -- Horário (pai da aula)
    LEFT JOIN FK2_MGH_TB_HORARIO h
      ON h.PK_HORARIO = a.FK_HORARIO

    -- Grade Curricular
    LEFT JOIN FK2_TB_GRADE_CURRICULAR g
      ON TO_NUMBER(NULLIF(h.FK_GRADE_CURRICULAR, '')) = g.CODIGO

    -- Unidade Curricular / Disciplina
    LEFT JOIN FK2_TB_DISCIPLINAS d
      ON g.CODIGO_DISCIPLINA = d.CODIGO

    -- Curso
    LEFT JOIN FK2_TB_CURSOS c
      ON g.CODIGO_CURSO = c.CODIGO

    -- Ano Curricular / Classe
    LEFT JOIN FK2_TB_CLASSES cl
      ON g.CODIGO_CLASSE = cl.CODIGO

    -- Docente substituto
    LEFT JOIN FK2_MGD_TB_DOCENTE doc_sub
      ON doc_sub.CODIGO = s.FK_DOCENTE_SUBSTITUTO

    -- Utilizador que criou
    LEFT JOIN FK2_MCA_TB_UTILIZADOR ut
      ON ut.PK_UTILIZADOR = s.CREATED_BY

      -- ANO LECTIVO 
      LEFT JOIN FK2_TB_ANO_LECTIVO al
        ON al.CODIGO = h.FK_ANO_LECTIVO

    WHERE s.PK_AULA_DOCENTE_SUBSTITUTO = :id
      AND s.ACTIVE_STATE = 1
    `,
    [id],
  );

  if (!rows || rows.length === 0) {
    return { success: false, message: 'Registo não encontrado.' };
  }

  const row = rows[0];

  return {
    success: true,
    data: (await toLowerCaseKeys([row]))[0],
  };
}

  // ==================== UPDATE ====================
  async update(
    id: number,
    userId: number = 1,
    dto: CreateDocenteSubstitutoDto,
  ): Promise<any> {
    const { fkDocenteOriginal, fkDocenteSubstituto, fkHorario, dataInicio, dataTermino, obs = null } = dto;

    await this.dataSource.query(
      `
      UPDATE CMPDEV.MGH_TB_AULA_DOCENTE_SUBSTITUTO
         SET FK_DOCENTE_ORIGINAL    = :fkDocenteOriginal,
             FK_DOCENTE_SUBSTITUTO  = :fkDocenteSubstituto,
             FK_HORARIO             = :fkHorario,
             DATA_INICIO            = TO_DATE(:dataInicio, 'YYYY-MM-DD'),
             DATA_TERMINO           = TO_DATE(:dataTermino, 'YYYY-MM-DD'),
             OBS                    = :obs,
             LAST_UPDATED_BY        = :userId,
             UPDATED_AT             = SYSDATE
       WHERE PK_AULA_DOCENTE_SUBSTITUTO = :id
         AND ACTIVE_STATE = 1
      `,
      {
        fkDocenteOriginal,
        fkDocenteSubstituto,
        fkHorario,
        dataInicio,
        dataTermino: dataTermino || null,
        obs,
        userId,
        id,
      } as any,
    );

    return {
      success: true,
      message: 'Docente substituto atualizado com sucesso!',
      id,
    };
  }

  // ==================== DELETE (soft delete) ====================
  async remove(id: number, userId: number = 1): Promise<any> {
    await this.dataSource.query(
      `
      UPDATE CMPDEV.MGH_TB_AULA_DOCENTE_SUBSTITUTO
         SET ACTIVE_STATE    = 0,
             LAST_UPDATED_BY = :userId,
             UPDATED_AT      = SYSDATE
       WHERE PK_AULA_DOCENTE_SUBSTITUTO = :id
      `,
      { userId, id } as any,
    );

    return {
      success: true,
      message: 'Docente substituto removido com sucesso!',
      id,
    };
  }
}