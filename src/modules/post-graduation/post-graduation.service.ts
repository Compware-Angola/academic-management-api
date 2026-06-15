import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FindPrimaryRecordsDto } from './dto/find-primary-records.dto';

@Injectable()
export class PostGraduationService {
  constructor(private readonly dataSource: DataSource) {}

  async findDegrees() {
    const rows = await this.dataSource.query(`
      SELECT
        ID,
        CASE ID
          WHEN 2 THEN 'Mestrado'
          WHEN 3 THEN 'Doutoramento'
        END AS DESIGNATION
      FROM FK2_TB_TIPO_CANDIDATURA
      WHERE ID IN (2, 3)
        AND STATUS_ = 1
      ORDER BY ID
    `);

    return {
      data: [
        {
          id: null,
          designation: 'Todos',
        },
        ...rows.map((row: Record<string, unknown>) => ({
          id: Number(row.ID),
          designation: row.DESIGNATION,
        })),
      ],
    };
  }

  async findPrimaryRecords(filters: FindPrimaryRecordsDto) {
    const {
      academicYearId,
      applicationTypeId,
      search,
      page = 1,
      limit = 20,
    } = filters;
    const offset = (page - 1) * limit;

    const conditions = [
      'P.CODIGO_TIPO_CANDIDATURA IN (2, 3)',
      `EXISTS (
        SELECT 1
        FROM FK2_TB_CONFIRMACOES CONF
        WHERE CONF.CODIGO_MATRICULA = M.CODIGO
          AND CONF.CODIGO_ANO_LECTIVO = :academicYearId
          AND CONF.ESTADO = 1
      )`,
    ];
    const params: Record<string, string | number> = {
      academicYearId,
    };

    if (applicationTypeId) {
      conditions.push('P.CODIGO_TIPO_CANDIDATURA = :applicationTypeId');
      params.applicationTypeId = applicationTypeId;
    }

    if (search?.trim()) {
      conditions.push(`(
        UPPER(P.NOME_COMPLETO) LIKE :search
        OR UPPER(NVL(P.BILHETE_IDENTIDADE, '-')) LIKE :search
        OR TO_CHAR(M.CODIGO) LIKE :search
        OR UPPER(CURSO.DESIGNACAO) LIKE :search
      )`);
      params.search = `%${search.trim().toUpperCase()}%`;
    }

    const whereClause = conditions.join(' AND ');
    const fromClause = `
      FROM FK2_TB_MATRICULAS M
      INNER JOIN FK2_TB_ADMISSAO ADM
        ON ADM.CODIGO = M.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO P
        ON P.CODIGO = ADM.PRE_INCRICAO
      INNER JOIN FK2_TB_TIPO_CANDIDATURA TIPO
        ON TIPO.ID = P.CODIGO_TIPO_CANDIDATURA
      INNER JOIN FK2_TB_CURSOS CURSO
        ON CURSO.CODIGO = M.CODIGO_CURSO
      INNER JOIN FK2_TB_FACULDADE FACULDADE
        ON FACULDADE.CODIGO = CURSO.FACULDADE_ID
      LEFT JOIN FK2_TB_PROVINCIAS PROVINCIA
        ON PROVINCIA.CODIGO = P.CODIGO_PROVINCIA_RESIDENCIA_PERMANENTE
      LEFT JOIN FK2_TB_MUNICIPIOS MUNICIPIO
        ON MUNICIPIO.CODIGO = P.CODIGO_MUNICIPIO
      LEFT JOIN FK2_TB_NACIONALIDADES PAIS
        ON PAIS.CODIGO = P.CODIGO_NACIONALIDADE
      LEFT JOIN FK2_TB_PERIODOS PERIODO
        ON PERIODO.CODIGO = P.CODIGO_TURNO
      WHERE ${whereClause}
    `;

    const dataSql = `
      SELECT
        M.CODIGO AS ENROLLMENT_ID,
        P.NOME_COMPLETO AS FULL_NAME,
        P.BILHETE_IDENTIDADE AS IDENTITY_DOCUMENT,
        P.SEXO AS GENDER,
        CASE
          WHEN P.DATA_NASCIMENTO IS NOT NULL
            THEN FLOOR(MONTHS_BETWEEN(TRUNC(SYSDATE), P.DATA_NASCIMENTO) / 12)
          ELSE NULL
        END AS AGE,
        P.DATA_NASCIMENTO AS BIRTH_DATE,
        PROVINCIA.DESIGNACAO AS RESIDENCE_PROVINCE,
        MUNICIPIO.DESIGNACAO AS RESIDENCE_MUNICIPALITY,
        PAIS.DESIGNACAO AS COUNTRY_OF_ORIGIN,
        PERIODO.DESIGNACAO AS STUDY_PERIOD,
        FACULDADE.DESIGNACAO AS FACULTY,
        CURSO.DESIGNACAO AS COURSE,
        TIPO.ID AS APPLICATION_TYPE_ID,
        TIPO.DESIGNACAO AS APPLICATION_TYPE,
        (
          SELECT MAX(CONF.CLASSE)
          FROM FK2_TB_CONFIRMACOES CONF
          WHERE CONF.CODIGO_MATRICULA = M.CODIGO
            AND CONF.CODIGO_ANO_LECTIVO = :academicYearId
            AND CONF.ESTADO = 1
        ) AS CURRICULAR_YEAR,
        M.ESTADO_MATRICULA AS ENROLLMENT_STATUS
      ${fromClause}
      ORDER BY P.NOME_COMPLETO ASC, M.CODIGO ASC
      OFFSET :rowOffset ROWS FETCH NEXT :rowLimit ROWS ONLY
    `;

    const countSql = `
      SELECT COUNT(DISTINCT M.CODIGO) AS TOTAL
      ${fromClause}
    `;

    const [rows, countRows] = await Promise.all([
      this.dataSource.query(dataSql, {
        ...params,
        rowOffset: offset,
        rowLimit: limit,
      } as any),
      this.dataSource.query(countSql, params as any),
    ]);

    const total = Number(countRows[0]?.TOTAL ?? 0);

    return {
      data: rows.map((row: Record<string, unknown>, index: number) => ({
        number: offset + index + 1,
        enrollmentId: row.ENROLLMENT_ID,
        fullName: row.FULL_NAME,
        identityDocument: row.IDENTITY_DOCUMENT,
        gender: row.GENDER,
        age: row.AGE,
        birthDate: row.BIRTH_DATE,
        residenceProvince: row.RESIDENCE_PROVINCE,
        residenceMunicipality: row.RESIDENCE_MUNICIPALITY,
        countryOfOrigin: row.COUNTRY_OF_ORIGIN,
        studyPeriod: row.STUDY_PERIOD,
        faculty: row.FACULTY,
        course: row.COURSE,
        applicationTypeId: row.APPLICATION_TYPE_ID,
        applicationType: row.APPLICATION_TYPE,
        curricularYear: row.CURRICULAR_YEAR,
        enrollmentStatus: row.ENROLLMENT_STATUS,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
