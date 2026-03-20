import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindStudentsDTO } from './dto/find-students.dto';

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
}
