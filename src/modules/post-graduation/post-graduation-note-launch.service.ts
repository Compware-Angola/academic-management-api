import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FindNoteLaunchOptionsDto } from './dto/find-note-launch-options.dto';
import { FindNoteLaunchStudentsDto } from './dto/find-note-launch-students.dto';

type DatabaseRow = Record<string, unknown>;

@Injectable()
export class PostGraduationNoteLaunchService {
  constructor(private readonly dataSource: DataSource) {}

  async findOptions(filters: FindNoteLaunchOptionsDto, userId: number) {
    const { academicYearId, degreeId, semesterId, courseId } = filters;
    const params = {
      academicYearId,
      degreeId,
      semesterId,
      courseId: courseId ?? null,
      userId,
    };

    const [contexts, assessmentTypes, examTypes] = await Promise.all([
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT DISTINCT
          C.CODIGO AS COURSE_ID,
          C.DESIGNACAO AS COURSE,
          GC.CODIGO_CLASSE AS CURRICULAR_YEAR_ID,
          CL.DESIGNACAO AS CURRICULAR_YEAR,
          GC.CODIGO AS CURRICULAR_GRADE_ID,
          D.CODIGO AS CURRICULAR_UNIT_ID,
          D.DESIGNACAO AS CURRICULAR_UNIT,
          H.PK_HORARIO AS SCHEDULE_ID,
          H.DESIGNACAO AS SCHEDULE,
          H.FK_PERIODO AS PERIOD_ID,
          P.DESIGNACAO AS PERIOD
        FROM FK2_MGH_TB_HORARIO H
        INNER JOIN FK2_TB_GRADE_CURRICULAR GC
          ON GC.CODIGO = TO_NUMBER(NULLIF(H.FK_GRADE_CURRICULAR, ''))
        INNER JOIN FK2_TB_DISCIPLINAS D
          ON D.CODIGO = GC.CODIGO_DISCIPLINA
        INNER JOIN FK2_TB_CURSOS C
          ON C.CODIGO = GC.CODIGO_CURSO
        INNER JOIN FK2_TB_CLASSES CL
          ON CL.CODIGO = GC.CODIGO_CLASSE
        INNER JOIN FK2_TB_PERIODOS P
          ON P.CODIGO = H.FK_PERIODO
        WHERE H.FK_ANO_LECTIVO = :academicYearId
          AND H.FK_SEMESTRE = :semesterId
          AND C.TIPO_CANDIDATURA = :degreeId
          AND C.TIPO_CANDIDATURA IN (2, 3)
          AND (:courseId IS NULL OR C.CODIGO = :courseId)
          AND H.ACTIVE_STATE = 1
          AND NVL(H.FK_ESTADO_HORARIO_WF, 0) <> 4
          AND GC.STATUS_ = 1
          AND C.STATUS_ = 1
          AND P.STATUS_ = 1
          AND EXISTS (
            SELECT 1
            FROM FK2_MGH_TB_AULA A
            WHERE A.FK_HORARIO = H.PK_HORARIO
              AND A.ACTIVE_STATE = 1
              AND JSON_VALUE(
                A.REF_DOCENTE,
                '$.pkDocente' RETURNING NUMBER NULL ON ERROR
              ) = :userId
          )
        ORDER BY
          C.DESIGNACAO,
          CL.CODIGO,
          D.DESIGNACAO,
          H.DESIGNACAO
        `,
        params as unknown as any[],
      ),
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT
          CODIGO AS ID,
          DESIGNACAO,
          DESCRICAO AS CODE
        FROM FK2_TB_TIPO_AVALIACAO
        WHERE CODIGO IN (2, 3, 4, 5, 6, 7, 9, 11, 22, 23, 24)
        ORDER BY CODIGO
        `,
      ),
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT
          CODIGO AS ID,
          DESIGNACAO
        FROM FK2_TB_TIPO_PROVA
        ORDER BY CODIGO
        `,
      ),
    ]);

    const courses = new Map<number, { id: number; designation: unknown }>();
    const curricularYears = new Map<
      string,
      { id: number; designation: unknown; courseId: number }
    >();
    const curricularUnits = new Map<
      number,
      {
        curricularGradeId: number;
        curricularUnitId: number;
        designation: unknown;
        courseId: number;
        curricularYearId: number;
      }
    >();
    const periods = new Map<number, { id: number; designation: unknown }>();

    contexts.forEach((row) => {
      const currentCourseId = Number(row.COURSE_ID);
      const curricularYearId = Number(row.CURRICULAR_YEAR_ID);
      const curricularGradeId = Number(row.CURRICULAR_GRADE_ID);
      const periodId = Number(row.PERIOD_ID);

      courses.set(currentCourseId, {
        id: currentCourseId,
        designation: row.COURSE,
      });
      curricularYears.set(`${currentCourseId}:${curricularYearId}`, {
        id: curricularYearId,
        designation: row.CURRICULAR_YEAR,
        courseId: currentCourseId,
      });
      curricularUnits.set(curricularGradeId, {
        curricularGradeId,
        curricularUnitId: Number(row.CURRICULAR_UNIT_ID),
        designation: row.CURRICULAR_UNIT,
        courseId: currentCourseId,
        curricularYearId,
      });
      periods.set(periodId, {
        id: periodId,
        designation: row.PERIOD,
      });
    });

    return {
      data: {
        courses: [...courses.values()],
        curricularYears: [...curricularYears.values()],
        curricularUnits: [...curricularUnits.values()],
        schedules: contexts.map((row) => ({
          id: Number(row.SCHEDULE_ID),
          designation: row.SCHEDULE,
          courseId: Number(row.COURSE_ID),
          curricularYearId: Number(row.CURRICULAR_YEAR_ID),
          curricularGradeId: Number(row.CURRICULAR_GRADE_ID),
          periodId: Number(row.PERIOD_ID),
        })),
        periods: [...periods.values()],
        assessmentTypes: assessmentTypes.map((row) => ({
          id: Number(row.ID),
          designation: row.DESIGNACAO,
          code: row.CODE,
        })),
        examTypes: examTypes.map((row) => ({
          id: Number(row.ID),
          designation: row.DESIGNACAO,
        })),
      },
    };
  }

  async findStudents(filters: FindNoteLaunchStudentsDto, userId: number) {
    const context = await this.findAcademicContext(filters, userId);
    const { search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    const params: Record<string, number | string | null> = {
      academicYearId: filters.academicYearId,
      curricularGradeId: filters.curricularGradeId,
      scheduleId: filters.scheduleId,
      periodId: filters.periodId,
      examTypeId: filters.examTypeId,
      assessmentTypeId: filters.assessmentTypeId,
      search: search ?? null,
    };
    const conditions = [
      'GCA.CODIGO_GRADE_CURRICULAR = :curricularGradeId',
      'GCA.CODIGO_ANO_LECTIVO = :academicYearId',
      `JSON_VALUE(
        GCA.REF_HORARIO,
        '$.pk' RETURNING NUMBER NULL ON ERROR
      ) = :scheduleId`,
      'GCA.CODIGO_STATUS_GRADE_CURRICULAR <> 5',
      'PRE.CODIGO_TURNO = :periodId',
      `(
        :search IS NULL
        OR TO_CHAR(M.CODIGO) = :search
        OR FN_REMOVE_ACENTOS(UPPER(PRE.NOME_COMPLETO))
           LIKE '%' || FN_REMOVE_ACENTOS(UPPER(:search)) || '%'
      )`,
    ];

    if (filters.assessmentTypeId === 6) {
      conditions.push(`
        NOT EXISTS (
          SELECT 1
          FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES PREVIOUS_NOTE
          WHERE PREVIOUS_NOTE.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
            AND PREVIOUS_NOTE.TIPO_AVALIACAO = 2
            AND PREVIOUS_NOTE.NOTA >= 8
        )
      `);
    }

    const studentsQuery = `
      SELECT
        GCA.CODIGO AS STUDENT_CURRICULAR_GRADE_ID,
        M.CODIGO AS ENROLLMENT_ID,
        PRE.NOME_COMPLETO AS FULL_NAME,
        GCA.CODIGO_STATUS_GRADE_CURRICULAR AS ACADEMIC_STATUS_ID,
        SGC.DESIGNACAO AS ACADEMIC_STATUS,
        NOTE.CODIGO AS NOTE_ID,
        NOTE.NOTA AS GRADE,
        NOTE.OBSERVACAO AS OBSERVATION,
        NOTE.STATUS_ AS NOTE_STATUS,
        TO_CHAR(NOTE.CREATED_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS CREATED_AT,
        TO_CHAR(NOTE.UPDATE_AT, 'YYYY-MM-DD"T"HH24:MI:SS') AS UPDATED_AT
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
      INNER JOIN FK2_TB_MATRICULAS M
        ON M.CODIGO = GCA.CODIGO_MATRICULA
      INNER JOIN FK2_TB_ADMISSAO AD
        ON AD.CODIGO = M.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO PRE
        ON PRE.CODIGO = AD.PRE_INCRICAO
      INNER JOIN FK2_TB_STATUS_GRADE_CURRICULAR SGC
        ON SGC.CODIGO = GCA.CODIGO_STATUS_GRADE_CURRICULAR
      LEFT JOIN (
        SELECT
          RANKED_NOTE.CODIGO,
          RANKED_NOTE.GRADE_CURRICULAR_ALUNO,
          RANKED_NOTE.NOTA,
          RANKED_NOTE.OBSERVACAO,
          RANKED_NOTE.STATUS_,
          RANKED_NOTE.CREATED_AT,
          RANKED_NOTE.UPDATE_AT
        FROM (
          SELECT
            CURRENT_NOTE.*,
            ROW_NUMBER() OVER (
              PARTITION BY
                CURRENT_NOTE.GRADE_CURRICULAR_ALUNO,
                CURRENT_NOTE.TIPO_DE_PROVA,
                CURRENT_NOTE.TIPO_AVALIACAO
              ORDER BY
                NVL(CURRENT_NOTE.UPDATE_AT, CURRENT_NOTE.CREATED_AT) DESC,
                CURRENT_NOTE.CODIGO DESC
            ) AS RN
          FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES CURRENT_NOTE
          WHERE CURRENT_NOTE.TIPO_DE_PROVA = :examTypeId
            AND CURRENT_NOTE.TIPO_AVALIACAO = :assessmentTypeId
        ) RANKED_NOTE
        WHERE RANKED_NOTE.RN = 1
      ) NOTE
        ON NOTE.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
      WHERE ${conditions.join(' AND ')}
    `;

    const [rows, summaryRows] = await Promise.all([
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT *
        FROM (${studentsQuery})
        ORDER BY FULL_NAME, ENROLLMENT_ID
        OFFSET :rowOffset ROWS FETCH NEXT :rowLimit ROWS ONLY
        `,
        {
          ...params,
          rowOffset: offset,
          rowLimit: limit,
        } as unknown as any[],
      ),
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT
          COUNT(*) AS TOTAL,
          SUM(CASE WHEN GRADE IS NOT NULL THEN 1 ELSE 0 END) AS WITH_GRADE,
          SUM(CASE WHEN GRADE IS NULL THEN 1 ELSE 0 END) AS WITHOUT_GRADE
        FROM (${studentsQuery})
        `,
        params as unknown as any[],
      ),
    ]);

    const total = Number(summaryRows[0]?.TOTAL ?? 0);

    return {
      context: {
        academicYearId: Number(context.ACADEMIC_YEAR_ID),
        academicYear: context.ACADEMIC_YEAR,
        degreeId: Number(context.DEGREE_ID),
        degree: context.DEGREE,
        semesterId: Number(context.SEMESTER_ID),
        semester: context.SEMESTER,
        periodId: Number(context.PERIOD_ID),
        period: context.PERIOD,
        courseId: Number(context.COURSE_ID),
        course: context.COURSE,
        curricularYearId: Number(context.CURRICULAR_YEAR_ID),
        curricularYear: context.CURRICULAR_YEAR,
        curricularGradeId: Number(context.CURRICULAR_GRADE_ID),
        curricularUnitId: Number(context.CURRICULAR_UNIT_ID),
        curricularUnit: context.CURRICULAR_UNIT,
        scheduleId: Number(context.SCHEDULE_ID),
        schedule: context.SCHEDULE,
        examTypeId: Number(context.EXAM_TYPE_ID),
        examType: context.EXAM_TYPE,
        assessmentTypeId: Number(context.ASSESSMENT_TYPE_ID),
        assessmentType: context.ASSESSMENT_TYPE,
      },
      data: rows.map((row) => ({
        studentCurricularGradeId: Number(row.STUDENT_CURRICULAR_GRADE_ID),
        enrollmentId: Number(row.ENROLLMENT_ID),
        fullName: row.FULL_NAME,
        academicStatusId: Number(row.ACADEMIC_STATUS_ID),
        academicStatus: row.ACADEMIC_STATUS,
        note: {
          id: this.toNullableNumber(row.NOTE_ID),
          grade: this.toNullableNumber(row.GRADE),
          observation: row.OBSERVATION,
          status: this.toNullableNumber(row.NOTE_STATUS),
          createdAt: row.CREATED_AT,
          updatedAt: row.UPDATED_AT,
        },
      })),
      summary: {
        total,
        withGrade: Number(summaryRows[0]?.WITH_GRADE ?? 0),
        withoutGrade: Number(summaryRows[0]?.WITHOUT_GRADE ?? 0),
      },
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async findAcademicContext(
    filters: FindNoteLaunchStudentsDto,
    userId: number,
  ) {
    const rows = await this.dataSource.query<DatabaseRow[]>(
      `
      SELECT
        H.FK_ANO_LECTIVO AS ACADEMIC_YEAR_ID,
        ANO.DESIGNACAO AS ACADEMIC_YEAR,
        C.TIPO_CANDIDATURA AS DEGREE_ID,
        TC.DESIGNACAO AS DEGREE,
        H.FK_SEMESTRE AS SEMESTER_ID,
        SEM.DESIGNACAO AS SEMESTER,
        H.FK_PERIODO AS PERIOD_ID,
        P.DESIGNACAO AS PERIOD,
        C.CODIGO AS COURSE_ID,
        C.DESIGNACAO AS COURSE,
        GC.CODIGO_CLASSE AS CURRICULAR_YEAR_ID,
        CL.DESIGNACAO AS CURRICULAR_YEAR,
        GC.CODIGO AS CURRICULAR_GRADE_ID,
        D.CODIGO AS CURRICULAR_UNIT_ID,
        D.DESIGNACAO AS CURRICULAR_UNIT,
        H.PK_HORARIO AS SCHEDULE_ID,
        H.DESIGNACAO AS SCHEDULE,
        TP.CODIGO AS EXAM_TYPE_ID,
        TP.DESIGNACAO AS EXAM_TYPE,
        TA.CODIGO AS ASSESSMENT_TYPE_ID,
        TA.DESIGNACAO AS ASSESSMENT_TYPE
      FROM FK2_MGH_TB_HORARIO H
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON GC.CODIGO = TO_NUMBER(NULLIF(H.FK_GRADE_CURRICULAR, ''))
      INNER JOIN FK2_TB_DISCIPLINAS D
        ON D.CODIGO = GC.CODIGO_DISCIPLINA
      INNER JOIN FK2_TB_CURSOS C
        ON C.CODIGO = GC.CODIGO_CURSO
      INNER JOIN FK2_TB_TIPO_CANDIDATURA TC
        ON TC.ID = C.TIPO_CANDIDATURA
      INNER JOIN FK2_TB_ANO_LECTIVO ANO
        ON ANO.CODIGO = H.FK_ANO_LECTIVO
      INNER JOIN FK2_MCAL_TB_SEMESTRE SEM
        ON SEM.PK_SEMESTRE = H.FK_SEMESTRE
      INNER JOIN FK2_TB_PERIODOS P
        ON P.CODIGO = H.FK_PERIODO
      INNER JOIN FK2_TB_CLASSES CL
        ON CL.CODIGO = GC.CODIGO_CLASSE
      INNER JOIN FK2_TB_TIPO_PROVA TP
        ON TP.CODIGO = :examTypeId
      INNER JOIN FK2_TB_TIPO_AVALIACAO TA
        ON TA.CODIGO = :assessmentTypeId
      WHERE H.PK_HORARIO = :scheduleId
        AND H.FK_ANO_LECTIVO = :academicYearId
        AND H.FK_SEMESTRE = :semesterId
        AND H.FK_PERIODO = :periodId
        AND GC.CODIGO = :curricularGradeId
        AND GC.CODIGO_CURSO = :courseId
        AND GC.CODIGO_CLASSE = :curricularYearId
        AND C.TIPO_CANDIDATURA = :degreeId
        AND C.TIPO_CANDIDATURA IN (2, 3)
        AND TA.CODIGO IN (2, 3, 4, 5, 6, 7, 9, 11, 22, 23, 24)
        AND H.ACTIVE_STATE = 1
        AND NVL(H.FK_ESTADO_HORARIO_WF, 0) <> 4
        AND GC.STATUS_ = 1
        AND C.STATUS_ = 1
        AND TC.STATUS_ = 1
        AND P.STATUS_ = 1
        AND EXISTS (
          SELECT 1
          FROM FK2_MGH_TB_AULA A
          WHERE A.FK_HORARIO = H.PK_HORARIO
            AND A.ACTIVE_STATE = 1
            AND JSON_VALUE(
              A.REF_DOCENTE,
              '$.pkDocente' RETURNING NUMBER NULL ON ERROR
            ) = :userId
        )
      FETCH FIRST 1 ROWS ONLY
      `,
      {
        academicYearId: filters.academicYearId,
        degreeId: filters.degreeId,
        semesterId: filters.semesterId,
        periodId: filters.periodId,
        courseId: filters.courseId,
        curricularYearId: filters.curricularYearId,
        curricularGradeId: filters.curricularGradeId,
        scheduleId: filters.scheduleId,
        examTypeId: filters.examTypeId,
        assessmentTypeId: filters.assessmentTypeId,
        userId,
      } as unknown as any[],
    );

    if (!rows.length) {
      throw new NotFoundException(
        'Contexto de lancamento de notas da Pos-Graduacao nao encontrado',
      );
    }

    return rows[0];
  }

  private toNullableNumber(value: unknown): number | null {
    return value === null || value === undefined ? null : Number(value);
  }
}
