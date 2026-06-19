import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FindAttendanceListDto } from './dto/find-attendance-list.dto';

type DatabaseRow = Record<string, unknown>;

/**
 * Produz a lista de presença de Pós-Graduação a partir de critérios
 * exclusivamente académicos. A situação financeira do estudante não participa
 * da elegibilidade deste fluxo.
 */
@Injectable()
export class PostGraduationAttendanceListService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Valida o contexto selecionado e lista, com pesquisa e paginação, os
   * estudantes ativos inscritos na respetiva grade curricular e horário.
   */
  async findAll(filters: FindAttendanceListDto) {
    const context = await this.findAcademicContext(filters);
    const { search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    const params: Record<string, number | string> = {
      academicYearId: filters.academicYearId,
      curricularGradeId: filters.curricularGradeId,
      scheduleId: filters.scheduleId,
    };
    const conditions = [
      'GCA.CODIGO_GRADE_CURRICULAR = :curricularGradeId',
      'GCA.CODIGO_ANO_LECTIVO = :academicYearId',
      `JSON_VALUE(
        GCA.REF_HORARIO,
        '$.pk' RETURNING NUMBER NULL ON ERROR
      ) = :scheduleId`,
      `LOWER(TRIM(M.ESTADO_MATRICULA)) = 'activo'`,
      'GCA.CODIGO_STATUS_GRADE_CURRICULAR = 2',
    ];

    if (search) {
      conditions.push(`
        (
          TO_CHAR(M.CODIGO) = :search
          OR FN_REMOVE_ACENTOS(UPPER(PRE.NOME_COMPLETO))
             LIKE '%' || FN_REMOVE_ACENTOS(UPPER(:search)) || '%'
        )
      `);
      params.search = search;
    }

    /*
     * Query de elegibilidade:
     * - SELECT identifica matrícula, nome e estado académico;
     * - JOIN recompõe o estudante desde a inscrição na grade até à pré-inscrição;
     * - WHERE restringe ao contexto e aos estados académicos aceites;
     * - nenhum bloco consulta pagamentos, bolsas, dívidas ou mensalidades.
     */
    const eligibleStudents = `
      SELECT DISTINCT
        M.CODIGO AS ENROLLMENT_ID,
        PRE.NOME_COMPLETO AS FULL_NAME,
        SGC.DESIGNACAO AS ACADEMIC_STATUS
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
      INNER JOIN FK2_TB_MATRICULAS M
        ON M.CODIGO = GCA.CODIGO_MATRICULA
      INNER JOIN FK2_TB_ADMISSAO AD
        ON AD.CODIGO = M.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO PRE
        ON PRE.CODIGO = AD.PRE_INCRICAO
      INNER JOIN FK2_TB_STATUS_GRADE_CURRICULAR SGC
        ON SGC.CODIGO = GCA.CODIGO_STATUS_GRADE_CURRICULAR
      WHERE ${conditions.join(' AND ')}
    `;

    /*
     * A primeira query ordena e pagina a seleção elegível. A segunda reutiliza
     * exatamente a mesma seleção para contar o total sem divergência de filtros.
     */
    const [rows, countRows] = await Promise.all([
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT
          ENROLLMENT_ID,
          FULL_NAME,
          ACADEMIC_STATUS
        FROM (${eligibleStudents})
        ORDER BY FULL_NAME, ENROLLMENT_ID
        OFFSET :rowOffset ROWS FETCH NEXT :rowLimit ROWS ONLY
        `,
        {
          ...params,
          rowOffset: offset,
          rowLimit: limit,
        } as any,
      ),
      this.dataSource.query<DatabaseRow[]>(
        `SELECT COUNT(*) AS TOTAL FROM (${eligibleStudents})`,
        params as any,
      ),
    ]);

    const total = Number(countRows[0]?.TOTAL ?? 0);

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
      },
      data: rows.map((row, index) => ({
        number: offset + index + 1,
        enrollmentId: Number(row.ENROLLMENT_ID),
        fullName: row.FULL_NAME,
        academicStatus: row.ACADEMIC_STATUS,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Confirma que todos os identificadores recebidos representam o mesmo
   * contexto ativo de Pós-Graduação antes de consultar os estudantes.
   */
  private async findAcademicContext(filters: FindAttendanceListDto) {
    /*
     * Query de contexto:
     * - SELECT devolve as designações usadas no cabeçalho da lista;
     * - JOIN valida a cadeia horário -> grade -> UC -> curso e referências;
     * - WHERE exige correspondência integral dos filtros, grau 2/3 e registos ativos;
     * - FETCH FIRST protege o contrato de retorno de um único contexto.
     */
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
        PERIODO.DESIGNACAO AS PERIOD,
        C.CODIGO AS COURSE_ID,
        C.DESIGNACAO AS COURSE,
        GC.CODIGO_CLASSE AS CURRICULAR_YEAR_ID,
        CL.DESIGNACAO AS CURRICULAR_YEAR,
        GC.CODIGO AS CURRICULAR_GRADE_ID,
        D.CODIGO AS CURRICULAR_UNIT_ID,
        D.DESIGNACAO AS CURRICULAR_UNIT,
        H.PK_HORARIO AS SCHEDULE_ID,
        H.DESIGNACAO AS SCHEDULE
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
      INNER JOIN FK2_TB_PERIODOS PERIODO
        ON PERIODO.CODIGO = H.FK_PERIODO
      INNER JOIN FK2_TB_CLASSES CL
        ON CL.CODIGO = GC.CODIGO_CLASSE
      WHERE H.PK_HORARIO = :scheduleId
        AND H.FK_ANO_LECTIVO = :academicYearId
        AND H.FK_SEMESTRE = :semesterId
        AND H.FK_PERIODO = :periodId
        AND GC.CODIGO = :curricularGradeId
        AND GC.CODIGO_CURSO = :courseId
        AND GC.CODIGO_CLASSE = :curricularYearId
        AND C.TIPO_CANDIDATURA = :degreeId
        AND C.TIPO_CANDIDATURA IN (2, 3)
        AND H.ACTIVE_STATE = 1
        AND NVL(H.FK_ESTADO_HORARIO_WF, 0) <> 4
        AND GC.STATUS_ = 1
        AND C.STATUS_ = 1
        AND TC.STATUS_ = 1
        AND PERIODO.STATUS_ = 1
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
      } as any,
    );

    if (!rows.length) {
      throw new NotFoundException(
        'Contexto academico de Pos-Graduacao nao encontrado',
      );
    }

    return rows[0];
  }
}
