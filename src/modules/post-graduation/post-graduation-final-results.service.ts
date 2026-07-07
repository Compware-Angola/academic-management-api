import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FindPostGraduationFinalResultsDto } from './dto/find-final-results.dto';

type DatabaseRow = Record<string, unknown>;

/**
 * Consulta resultados finais do Exame de Acesso exclusivamente para
 * candidaturas de Mestrado e Doutoramento.
 */
@Injectable()
export class PostGraduationFinalResultsService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Retorna uma linha por candidato. A prova e a admissão permanecem como
   * informações distintas para não transformar participação em admissão.
   */
  async findAll(filters: FindPostGraduationFinalResultsDto) {
    const {
      academicYearId,
      degreeId,
      courseId,
      facultyId,
      periodId,
      roomId,
      candidateId,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;
    const offset = (page - 1) * limit;

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException(
        'A data inicial não pode ser posterior à data final',
      );
    }

    await this.validateAcademicContext(academicYearId, degreeId);

    const proofConditions = ['HP.ANO_LECTIVO_ID = :academicYearId'];
    const candidateConditions = [
      'PRE.ANOLECTIVO = :academicYearId',
      'PRE.CODIGO_TIPO_CANDIDATURA = :degreeId',
      'PRE.CODIGO_TIPO_CANDIDATURA IN (2, 3)',
      'C.TIPO_CANDIDATURA = :degreeId',
    ];
    const params: Record<string, number | string> = {
      academicYearId,
      degreeId,
    };

    if (periodId) {
      proofConditions.push('HP.PERIODO_ID = :periodId');
      params.periodId = periodId;
    }

    if (roomId) {
      proofConditions.push('HP.SALA_ID = :roomId');
      params.roomId = roomId;
    }

    if (startDate) {
      proofConditions.push(
        `HP.DATA_REALIZACAO >= TO_DATE(:startDate, 'YYYY-MM-DD')`,
      );
      params.startDate = startDate;
    }

    if (endDate) {
      proofConditions.push(
        `HP.DATA_REALIZACAO < TO_DATE(:endDate, 'YYYY-MM-DD') + 1`,
      );
      params.endDate = endDate;
    }

    if (courseId) {
      candidateConditions.push('C.CODIGO = :courseId');
      params.courseId = courseId;
    }

    if (facultyId) {
      candidateConditions.push('F.CODIGO = :facultyId');
      params.facultyId = facultyId;
    }

    if (candidateId) {
      candidateConditions.push('PRE.CODIGO = :candidateId');
      params.candidateId = candidateId;
    }

    const normalizedSearch = search?.trim();

    if (normalizedSearch) {
      candidateConditions.push(`
        (
          UPPER(DBMS_LOB.SUBSTR(PRE.NOME_COMPLETO, 4000, 1))
            LIKE UPPER(:search)
          OR UPPER(DBMS_LOB.SUBSTR(PRE.BILHETE_IDENTIDADE, 4000, 1))
            LIKE UPPER(:search)
        )
      `);
      params.search = `%${normalizedSearch}%`;
    }

    const commonTableExpressionsSql = `
      WITH RANKED_PROOFS AS (
        SELECT
          CP.CANDIDATO_ID,
          CP.NOTA AS EXAM_SCORE,
          CP.STATUS_ AS PROOF_STATUS,
          HP.ID AS EXAM_SCHEDULE_ID,
          HP.PERIODO_ID AS PERIOD_ID,
          PER.DESIGNACAO AS PERIOD,
          HP.SALA_ID AS ROOM_ID,
          R.DESIGNACAO AS ROOM,
          HP.DATA_REALIZACAO AS EXAM_DATE,
          ROW_NUMBER() OVER (
            PARTITION BY CP.CANDIDATO_ID
            ORDER BY
              HP.DATA_REALIZACAO DESC NULLS LAST,
              CP.CREATED_AT DESC NULLS LAST,
              HP.ID DESC
          ) AS ROW_POSITION
        FROM FK2_CANDIDATO_PROVAS CP
        INNER JOIN FK2_TB_HORARIO_PROVA HP
          ON HP.ID = CP.HORARIO_PROVA_ID
        LEFT JOIN FK2_TB_PERIODOS PER
          ON PER.CODIGO = HP.PERIODO_ID
        LEFT JOIN FK2_TB_SALAS R
          ON R.CODIGO = HP.SALA_ID
        WHERE ${proofConditions.join(' AND ')}
      ),
      RANKED_ADMISSIONS AS (
        SELECT
          ADM.CODIGO AS ADMISSION_ID,
          ADM.PRE_INCRICAO AS CANDIDATE_ID,
          ADM.MEDIAFINAL AS ADMISSION_AVERAGE,
          ADM.RESULTADO AS ADMISSION_RESULT,
          ADM.DATA AS ADMISSION_DATE,
          ROW_NUMBER() OVER (
            PARTITION BY ADM.PRE_INCRICAO
            ORDER BY ADM.DATA DESC NULLS LAST, ADM.CODIGO DESC
          ) AS ROW_POSITION
        FROM FK2_TB_ADMISSAO ADM
      )
    `;

    const commonFromSql = `
      FROM FK2_TB_PREINSCRICAO PRE
      INNER JOIN FK2_TB_CURSOS C
        ON C.CODIGO = PRE.CURSO_CANDIDATURA
      INNER JOIN FK2_TB_TIPO_CANDIDATURA TC
        ON TC.ID = PRE.CODIGO_TIPO_CANDIDATURA
      INNER JOIN FK2_TB_FACULDADE F
        ON F.CODIGO = C.FACULDADE_ID
      INNER JOIN RANKED_PROOFS RP
        ON RP.CANDIDATO_ID = PRE.CODIGO
       AND RP.ROW_POSITION = 1
      LEFT JOIN RANKED_ADMISSIONS RA
        ON RA.CANDIDATE_ID = PRE.CODIGO
       AND RA.ROW_POSITION = 1
      WHERE ${candidateConditions.join(' AND ')}
    `;

    /*
     * A prova mais recente dentro dos filtros representa o candidato sem
     * calcular uma média inexistente na regra validada. A admissão é LEFT JOIN:
     * candidatos reprovados ou ainda pendentes não desaparecem da listagem.
     */
    const dataSql = `
      ${commonTableExpressionsSql}
      SELECT
        PRE.CODIGO AS CANDIDATE_ID,
        DBMS_LOB.SUBSTR(PRE.NOME_COMPLETO, 4000, 1) AS CANDIDATE_NAME,
        DBMS_LOB.SUBSTR(
          PRE.BILHETE_IDENTIDADE,
          4000,
          1
        ) AS IDENTITY_DOCUMENT,
        PRE.CODIGO_TIPO_CANDIDATURA AS DEGREE_ID,
        TC.DESIGNACAO AS DEGREE,
        C.CODIGO AS COURSE_ID,
        C.DESIGNACAO AS COURSE,
        F.CODIGO AS FACULTY_ID,
        F.DESIGNACAO AS FACULTY,
        RP.EXAM_SCHEDULE_ID,
        RP.PERIOD_ID,
        RP.PERIOD,
        RP.ROOM_ID,
        RP.ROOM,
        TO_CHAR(RP.EXAM_DATE, 'YYYY-MM-DD') AS EXAM_DATE,
        RP.EXAM_SCORE,
        RP.PROOF_STATUS,
        RA.ADMISSION_ID,
        RA.ADMISSION_AVERAGE,
        RA.ADMISSION_RESULT,
        TO_CHAR(RA.ADMISSION_DATE, 'YYYY-MM-DD') AS ADMISSION_DATE,
        CASE
          WHEN RA.ADMISSION_ID IS NOT NULL THEN 'ADMITTED'
          WHEN RP.PROOF_STATUS = 0 THEN 'FAILED'
          ELSE 'PENDING'
        END AS RESULT_STATUS
      ${commonFromSql}
      ORDER BY
        DBMS_LOB.SUBSTR(PRE.NOME_COMPLETO, 4000, 1),
        PRE.CODIGO
      OFFSET :rowOffset ROWS FETCH NEXT :rowLimit ROWS ONLY
    `;

    const countSql = `
      ${commonTableExpressionsSql}
      SELECT COUNT(*) AS TOTAL
      ${commonFromSql}
    `;

    const [rows, countRows] = await Promise.all([
      this.dataSource.query<DatabaseRow[]>(dataSql, {
        ...params,
        rowOffset: offset,
        rowLimit: limit,
      } as unknown as any[]),
      this.dataSource.query<DatabaseRow[]>(
        countSql,
        params as unknown as any[],
      ),
    ]);

    const total = Number(countRows[0]?.TOTAL ?? 0);

    return {
      data: rows.map((row) => ({
        candidateId: Number(row.CANDIDATE_ID),
        candidateName: row.CANDIDATE_NAME,
        identityDocument: row.IDENTITY_DOCUMENT,
        degreeId: Number(row.DEGREE_ID),
        degree: row.DEGREE,
        courseId: Number(row.COURSE_ID),
        course: row.COURSE,
        facultyId: Number(row.FACULTY_ID),
        faculty: row.FACULTY,
        examScheduleId: Number(row.EXAM_SCHEDULE_ID),
        periodId: row.PERIOD_ID === null ? null : Number(row.PERIOD_ID),
        period: row.PERIOD,
        roomId: row.ROOM_ID === null ? null : Number(row.ROOM_ID),
        room: row.ROOM,
        examDate: row.EXAM_DATE,
        examScore: row.EXAM_SCORE === null ? null : Number(row.EXAM_SCORE),
        proofStatus:
          row.PROOF_STATUS === null ? null : Number(row.PROOF_STATUS),
        admissionId:
          row.ADMISSION_ID === null ? null : Number(row.ADMISSION_ID),
        admissionAverage:
          row.ADMISSION_AVERAGE === null ? null : Number(row.ADMISSION_AVERAGE),
        admissionResult: row.ADMISSION_RESULT,
        admissionDate: row.ADMISSION_DATE,
        resultStatus: row.RESULT_STATUS,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Diferencia um filtro válido sem resultados de um ano ou grau inexistente.
   */
  private async validateAcademicContext(
    academicYearId: number,
    degreeId: number,
  ): Promise<void> {
    const [academicYears, degrees] = await Promise.all([
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT CODIGO
        FROM FK2_TB_ANO_LECTIVO
        WHERE CODIGO = :academicYearId
        FETCH FIRST 1 ROWS ONLY
        `,
        { academicYearId } as unknown as any[],
      ),
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT ID
        FROM FK2_TB_TIPO_CANDIDATURA
        WHERE ID = :degreeId
          AND ID IN (2, 3)
          AND STATUS_ = 1
        FETCH FIRST 1 ROWS ONLY
        `,
        { degreeId } as unknown as any[],
      ),
    ]);

    if (!academicYears.length) {
      throw new NotFoundException('Ano lectivo não encontrado');
    }

    if (!degrees.length) {
      throw new NotFoundException('Grau ativo de Pós-Graduação não encontrado');
    }
  }
}
