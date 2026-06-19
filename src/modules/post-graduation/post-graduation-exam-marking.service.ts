import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import oracledb from 'oracledb';
import { DataSource, QueryRunner } from 'typeorm';
import { CreateExamMarkingDto } from './dto/create-exam-marking.dto';
import { FindExamMarkingOptionsDto } from './dto/find-exam-marking-options.dto';
import { FindExamMarkingsDto } from './dto/find-exam-markings.dto';

type DatabaseRow = Record<string, unknown>;

/**
 * Controla a marcação de provas de Pós-Graduação, incluindo opções do
 * formulário, listagem e validações de conflito antes da criação.
 */
@Injectable()
export class PostGraduationExamMarkingService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Retorna horários atribuídos ao docente e catálogos válidos para a marcação.
   */
  async findOptions(filters: FindExamMarkingOptionsDto, userId: number) {
    const { academicYearId, degreeId, semesterId, courseId } = filters;

    await this.validateAcademicContext(academicYearId, degreeId, courseId);

    const scheduleParams = {
      academicYearId,
      degreeId,
      semesterId,
      courseId: courseId ?? null,
      userId,
    };

    /*
     * Queries independentes:
     * - horários: somente UCs e cursos atribuídos ao docente;
     * - prazos: janelas de marcação no ano, grau e semestre;
     * - salas: espaços utilizáveis e respetiva capacidade;
     * - tipos, modalidades e períodos: catálogos operacionais ativos;
     * - docentes: candidatos válidos a vigilante.
     */
    const [schedules, terms, rooms, examTypes, modalities, periods, teachers] =
      await Promise.all([
        this.dataSource.query<DatabaseRow[]>(
          `
          SELECT DISTINCT
            H.PK_HORARIO AS SCHEDULE_ID,
            H.DESIGNACAO AS SCHEDULE,
            H.FK_PERIODO AS PERIOD_ID,
            GC.CODIGO AS CURRICULAR_GRADE_ID,
            D.CODIGO AS CURRICULAR_UNIT_ID,
            D.DESIGNACAO AS CURRICULAR_UNIT,
            C.CODIGO AS COURSE_ID,
            C.DESIGNACAO AS COURSE
          FROM FK2_MGH_TB_HORARIO H
          INNER JOIN FK2_TB_GRADE_CURRICULAR GC
            ON GC.CODIGO = TO_NUMBER(NULLIF(H.FK_GRADE_CURRICULAR, ''))
          INNER JOIN FK2_TB_DISCIPLINAS D
            ON D.CODIGO = GC.CODIGO_DISCIPLINA
          INNER JOIN FK2_TB_CURSOS C
            ON C.CODIGO = GC.CODIGO_CURSO
          WHERE H.ACTIVE_STATE = 1
            AND NVL(H.FK_ESTADO_HORARIO_WF, 0) <> 4
            AND H.FK_ANO_LECTIVO = :academicYearId
            AND H.FK_SEMESTRE = :semesterId
            AND GC.STATUS_ = 1
            AND C.STATUS_ = 1
            AND C.TIPO_CANDIDATURA = :degreeId
            AND (:courseId IS NULL OR C.CODIGO = :courseId)
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
          ORDER BY C.DESIGNACAO, D.DESIGNACAO, H.DESIGNACAO
          `,
          scheduleParams as any,
        ),
        this.dataSource.query<DatabaseRow[]>(
          `
          SELECT
            P.PK_PRAZO AS ID,
            P.FK_TIPO_AVALIACAO AS ASSESSMENT_TYPE_ID,
            TA.DESIGNACAO AS ASSESSMENT_TYPE,
            TO_CHAR(P.DATA_INICIO, 'YYYY-MM-DD') AS START_DATE,
            TO_CHAR(P.DATA_FIM, 'YYYY-MM-DD') AS END_DATE,
            CASE
              WHEN TRUNC(SYSDATE) BETWEEN TRUNC(P.DATA_INICIO)
                   AND TRUNC(P.DATA_FIM)
                THEN 1
              ELSE 0
            END AS IS_OPEN
          FROM FK2_MCAL_TB_PRAZO P
          LEFT JOIN FK2_MCAL_TB_TIPO_AVALIACAO TA
            ON TA.PK_TIPO_AVALIACAO = P.FK_TIPO_AVALIACAO
          WHERE P.FK_TIPO_PRAZO = 4
            AND P.FK_ANO_LECTIVO = :academicYearId
            AND P.FK_SEMESTRE = :semesterId
            AND P.TIPO_CANDIDATURA = :degreeId
            AND P.ACTIVE_STATE = 1
            AND P.DATA_INICIO <= P.DATA_FIM
          ORDER BY P.DATA_INICIO, TA.DESIGNACAO
          `,
          { academicYearId, semesterId, degreeId } as any,
        ),
        this.dataSource.query<DatabaseRow[]>(
          `
          SELECT
            S.CODIGO AS ID,
            S.DESIGNACAO,
            S.CAPACIDADE AS CAPACITY
          FROM FK2_TB_SALAS S
          WHERE S.DELETED_AT IS NULL
            AND UPPER(TRIM(S.UTILIZAVEL)) = 'SIM'
          ORDER BY S.DESIGNACAO
          `,
        ),
        this.dataSource.query<DatabaseRow[]>(
          `
          SELECT CODIGO AS ID, DESIGNACAO
          FROM FK2_TB_TIPO_PROVA
          ORDER BY DESIGNACAO
          `,
        ),
        this.dataSource.query<DatabaseRow[]>(
          `
          SELECT PK_MODALIDADE AS ID, DESIGNACAO
          FROM FK2_MGH_TB_MODALIDADE
          WHERE ACTIVE_STATE = 1
          ORDER BY DESIGNACAO
          `,
        ),
        this.dataSource.query<DatabaseRow[]>(
          `
          SELECT CODIGO AS ID, DESIGNACAO
          FROM FK2_TB_PERIODOS
          WHERE STATUS_ = 1
          ORDER BY CODIGO
          `,
        ),
        this.dataSource.query<DatabaseRow[]>(
          `
          SELECT DISTINCT
            U.PK_UTILIZADOR AS ID,
            U.NOME
          FROM FK2_MCA_TB_UTILIZADOR U
          WHERE U.ACTIVE_STATE = 1
            AND EXISTS (
              SELECT 1
              FROM FK2_MGD_TB_DOCENTE D
              WHERE JSON_VALUE(
                D.CODIGO_UTILIZADOR,
                '$.pk' RETURNING NUMBER NULL ON ERROR
              ) = U.PK_UTILIZADOR
            )
          ORDER BY U.NOME
          `,
        ),
      ]);

    const courses = new Map<number, { id: number; designation: unknown }>();
    const curricularUnits = new Map<
      number,
      {
        curricularGradeId: number;
        curricularUnitId: number;
        designation: unknown;
        courseId: number;
      }
    >();

    schedules.forEach((row) => {
      const currentCourseId = Number(row.COURSE_ID);
      const curricularGradeId = Number(row.CURRICULAR_GRADE_ID);

      courses.set(currentCourseId, {
        id: currentCourseId,
        designation: row.COURSE,
      });
      curricularUnits.set(curricularGradeId, {
        curricularGradeId,
        curricularUnitId: Number(row.CURRICULAR_UNIT_ID),
        designation: row.CURRICULAR_UNIT,
        courseId: currentCourseId,
      });
    });

    return {
      data: {
        courses: [...courses.values()],
        curricularUnits: [...curricularUnits.values()],
        schedules: schedules.map((row) => ({
          id: Number(row.SCHEDULE_ID),
          designation: row.SCHEDULE,
          courseId: Number(row.COURSE_ID),
          curricularGradeId: Number(row.CURRICULAR_GRADE_ID),
          periodId: this.toNullableNumber(row.PERIOD_ID),
        })),
        terms: terms.map((row) => ({
          id: Number(row.ID),
          assessmentTypeId: this.toNullableNumber(row.ASSESSMENT_TYPE_ID),
          assessmentType: row.ASSESSMENT_TYPE,
          startDate: row.START_DATE,
          endDate: row.END_DATE,
          isOpen: Number(row.IS_OPEN) === 1,
        })),
        rooms: rooms.map((row) => ({
          id: Number(row.ID),
          designation: row.DESIGNACAO,
          capacity: this.toNullableNumber(row.CAPACITY),
        })),
        examTypes: examTypes.map((row) => ({
          id: Number(row.ID),
          designation: row.DESIGNACAO,
        })),
        modalities: modalities.map((row) => ({
          id: Number(row.ID),
          designation: row.DESIGNACAO,
        })),
        periods: periods.map((row) => ({
          id: Number(row.ID),
          designation: row.DESIGNACAO,
        })),
        invigilators: teachers.map((row) => ({
          id: Number(row.ID),
          name: row.NOME,
        })),
      },
    };
  }

  /**
   * Lista as provas dos horários atribuídos ao docente autenticado.
   */
  async findAll(filters: FindExamMarkingsDto, userId: number) {
    const {
      academicYearId,
      degreeId,
      semesterId,
      courseId,
      termId,
      page = 1,
      limit = 20,
    } = filters;
    const offset = (page - 1) * limit;

    await this.validateAcademicContext(academicYearId, degreeId, courseId);

    const conditions = [
      'H.FK_ANO_LECTIVO = :academicYearId',
      'H.FK_SEMESTRE = :semesterId',
      'C.TIPO_CANDIDATURA = :degreeId',
      `EXISTS (
        SELECT 1
        FROM FK2_MGH_TB_AULA A
        WHERE A.FK_HORARIO = H.PK_HORARIO
          AND A.ACTIVE_STATE = 1
          AND JSON_VALUE(
            A.REF_DOCENTE,
            '$.pkDocente' RETURNING NUMBER NULL ON ERROR
          ) = :userId
      )`,
    ];
    const params: Record<string, number> = {
      academicYearId,
      semesterId,
      degreeId,
      userId,
    };

    if (courseId) {
      conditions.push('C.CODIGO = :courseId');
      params.courseId = courseId;
    }
    if (termId) {
      conditions.push('P.PK_PRAZO = :termId');
      params.termId = termId;
    }

    /*
     * Bloco relacional compartilhado:
     * - JOIN interpreta as referências JSON de horário e prazo;
     * - JOIN recompõe UC, curso e prazo;
     * - LEFT JOIN mantém a prova quando algum catálogo descritivo é opcional;
     * - WHERE aplica contexto, docente e filtros opcionais.
     */
    const fromClause = `
      FROM FK2_TB_CALENDARIO_PROVA CP
      INNER JOIN FK2_MGH_TB_HORARIO H
        ON H.PK_HORARIO = JSON_VALUE(
          CP.REF_HORARIO,
          '$.pk' RETURNING NUMBER NULL ON ERROR
        )
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON GC.CODIGO = TO_NUMBER(NULLIF(H.FK_GRADE_CURRICULAR, ''))
      INNER JOIN FK2_TB_DISCIPLINAS D
        ON D.CODIGO = GC.CODIGO_DISCIPLINA
      INNER JOIN FK2_TB_CURSOS C
        ON C.CODIGO = GC.CODIGO_CURSO
      INNER JOIN FK2_MCAL_TB_PRAZO P
        ON P.PK_PRAZO = JSON_VALUE(
          CP.REF_PRAZO,
          '$.pk_prazo' RETURNING NUMBER NULL ON ERROR
        )
      LEFT JOIN FK2_MCAL_TB_TIPO_AVALIACAO TA
        ON TA.PK_TIPO_AVALIACAO = P.FK_TIPO_AVALIACAO
      LEFT JOIN FK2_TB_TIPO_PROVA TP
        ON TP.CODIGO = CP.CODIGO_TIPO_PROVA
      LEFT JOIN FK2_MGH_TB_MODALIDADE MODALIDADE
        ON MODALIDADE.PK_MODALIDADE = CP.CODIGO_MODALIDADE
      LEFT JOIN FK2_TB_SALAS SALA
        ON SALA.CODIGO = CP.CODIGO_SALA
      LEFT JOIN FK2_TB_PERIODOS PERIODO
        ON PERIODO.CODIGO = CP.CODIGO_PERIODO
      LEFT JOIN FK2_MCA_TB_UTILIZADOR U
        ON U.PK_UTILIZADOR = CP.CODIGO_UTILIZADOR
      WHERE ${conditions.join(' AND ')}
    `;

    /*
     * A query de dados projeta, ordena e pagina as provas; a de contagem usa os
     * mesmos JOINs e filtros para manter a paginação consistente.
     */
    const [rows, countRows] = await Promise.all([
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT
          CP.CODIGO AS ID,
          C.CODIGO AS COURSE_ID,
          C.DESIGNACAO AS COURSE,
          GC.CODIGO AS CURRICULAR_GRADE_ID,
          D.CODIGO AS CURRICULAR_UNIT_ID,
          D.DESIGNACAO AS CURRICULAR_UNIT,
          H.PK_HORARIO AS SCHEDULE_ID,
          H.DESIGNACAO AS SCHEDULE,
          P.PK_PRAZO AS TERM_ID,
          TA.DESIGNACAO AS ASSESSMENT_TYPE,
          TP.CODIGO AS EXAM_TYPE_ID,
          TP.DESIGNACAO AS EXAM_TYPE,
          MODALIDADE.PK_MODALIDADE AS MODALITY_ID,
          MODALIDADE.DESIGNACAO AS MODALITY,
          SALA.CODIGO AS ROOM_ID,
          SALA.DESIGNACAO AS ROOM,
          PERIODO.CODIGO AS PERIOD_ID,
          PERIODO.DESIGNACAO AS PERIOD,
          TO_CHAR(CP.DATA_PROVA, 'YYYY-MM-DD') AS EXAM_DATE,
          TO_CHAR(CP.HORA_PROVA, 'HH24:MI') AS START_TIME,
          TO_CHAR(CP.HORA_TERMINO, 'HH24:MI') AS END_TIME,
          CP.ESTADO AS STATUS,
          CP.CODIGO_UTILIZADOR AS CREATED_BY_ID,
          U.NOME AS CREATED_BY
        ${fromClause}
        ORDER BY CP.DATA_PROVA DESC, CP.HORA_PROVA DESC, CP.CODIGO DESC
        OFFSET :rowOffset ROWS FETCH NEXT :rowLimit ROWS ONLY
        `,
        {
          ...params,
          rowOffset: offset,
          rowLimit: limit,
        } as any,
      ),
      this.dataSource.query<DatabaseRow[]>(
        `SELECT COUNT(*) AS TOTAL ${fromClause}`,
        params as any,
      ),
    ]);

    const invigilatorsByExam = await this.findInvigilatorsByExam(
      rows.map((row) => Number(row.ID)),
    );
    const total = Number(countRows[0]?.TOTAL ?? 0);

    return {
      data: rows.map((row) => ({
        id: Number(row.ID),
        courseId: Number(row.COURSE_ID),
        course: row.COURSE,
        curricularGradeId: Number(row.CURRICULAR_GRADE_ID),
        curricularUnitId: Number(row.CURRICULAR_UNIT_ID),
        curricularUnit: row.CURRICULAR_UNIT,
        scheduleId: Number(row.SCHEDULE_ID),
        schedule: row.SCHEDULE,
        termId: Number(row.TERM_ID),
        assessmentType: row.ASSESSMENT_TYPE,
        examTypeId: this.toNullableNumber(row.EXAM_TYPE_ID),
        examType: row.EXAM_TYPE,
        modalityId: this.toNullableNumber(row.MODALITY_ID),
        modality: row.MODALITY,
        roomId: this.toNullableNumber(row.ROOM_ID),
        room: row.ROOM,
        periodId: this.toNullableNumber(row.PERIOD_ID),
        period: row.PERIOD,
        examDate: row.EXAM_DATE,
        startTime: row.START_TIME,
        endTime: row.END_TIME,
        status: this.toNullableNumber(row.STATUS),
        createdById: this.toNullableNumber(row.CREATED_BY_ID),
        createdBy: row.CREATED_BY,
        invigilators: invigilatorsByExam.get(Number(row.ID)) ?? [],
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Marca uma prova numa transação depois de validar contexto, prazo, sala,
   * docente, vigilantes, duplicidade e conflitos de horário.
   */
  async create(body: CreateExamMarkingDto, userId: number) {
    const durationMinutes =
      this.timeToMinutes(body.endTime) - this.timeToMinutes(body.startTime);

    if (durationMinutes <= 0) {
      throw new BadRequestException(
        'A hora de termino deve ser posterior a hora de inicio',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.findActiveUser(userId, queryRunner);
      const schedule = await this.findAndLockSchedule(body, queryRunner);

      await this.validateScheduleTeacher(body.scheduleId, userId, queryRunner);
      const term = await this.findOpenTerm(body, queryRunner);
      await this.validateSimpleReferences(body, queryRunner);
      await this.validateRoomCapacity(body, schedule, queryRunner);
      await this.validateDuplicate(body, queryRunner);
      await this.validateRoomConflict(body, queryRunner);
      await this.validateTeacherConflict(body, userId, queryRunner);

      const invigilators = await this.findValidInvigilators(
        body.invigilatorUserIds,
        queryRunner,
      );
      await this.validateInvigilatorConflicts(body, queryRunner);

      const refUser = JSON.stringify({ pk: userId, desc: user.NOME });
      const refSchedule = JSON.stringify({
        pk: body.scheduleId,
        desc: schedule.SCHEDULE,
      });
      const refTerm = JSON.stringify({
        pk_prazo: body.termId,
        semestre: term.SEMESTER,
        tipoPrazo: term.TERM_TYPE,
        anoLectivo: term.ACADEMIC_YEAR,
        activeState: true,
        pk_semestre: body.semesterId,
        pk_tipoPrazo: 4,
        tipoAvalicao: term.ASSESSMENT_TYPE,
        pk_anoLectivo: body.academicYearId,
        pk_tipoAvalicao: term.ASSESSMENT_TYPE_ID,
      });

      /*
       * INSERT cria a prova com datas, horas e referências JSON compatíveis com
       * o esquema existente; RETURNING devolve o identificador gerado.
       */
      const result = (await queryRunner.query(
        `
        INSERT INTO FK2_TB_CALENDARIO_PROVA (
          CODIGO_CALENDARIO,
          CODIGO_TIPO_PROVA,
          CODIGO_MODALIDADE,
          CODIGO_TURMA,
          CODIGO_SALA,
          CODIGO_UTILIZADOR,
          CODIGO_PERIODO,
          CODIGO_DISCIPLINA,
          DATA_PROVA,
          DURACAOPROVA,
          HORA_TERMINO,
          HORA_PROVA,
          VIGILANTE,
          URL,
          ESTADO,
          REF_UTILIZADOR,
          REF_HORARIO,
          REF_PRAZO
        )
        VALUES (
          1,
          :examTypeId,
          :modalityId,
          NULL,
          :roomId,
          :userId,
          :periodId,
          :curricularUnitId,
          TO_DATE(:examDate, 'YYYY-MM-DD'),
          TO_DATE('1900-01-01', 'YYYY-MM-DD')
            + (:durationMinutes * 60) / 86400,
          TO_DATE(:endTime, 'HH24:MI'),
          TO_DATE(:startTime, 'HH24:MI'),
          NULL,
          NULL,
          1,
          :refUser,
          :refSchedule,
          :refTerm
        )
        RETURNING CODIGO INTO :outId
        `,
        {
          examTypeId: body.examTypeId,
          modalityId: body.modalityId,
          roomId: body.roomId,
          userId,
          periodId: body.periodId,
          curricularUnitId: Number(schedule.CURRICULAR_UNIT_ID),
          examDate: body.examDate,
          durationMinutes,
          endTime: body.endTime,
          startTime: body.startTime,
          refUser,
          refSchedule,
          refTerm,
          outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        } as any,
      )) as unknown as { outId?: number[] };

      const examId = Number(result.outId?.[0]);
      if (!examId) {
        throw new BadRequestException(
          'Nao foi possivel obter o codigo da prova criada',
        );
      }

      for (const invigilator of invigilators) {
        /*
         * INSERT associa cada vigilante validado à prova recém-criada e guarda
         * as referências de auditoria dentro da mesma transação.
         */
        await queryRunner.query(
          `
          INSERT INTO FK2_TB_CALENDARIO_PROVA_VIGILANTE (
            CALENDARIO_PROVA,
            VIGILANTE,
            DATA,
            STATUS_,
            CODIGO_UTILIZADOR_REGISTO,
            REF_VIGILANTE,
            REF_UTILIZADOR_REGISTOU,
            REF_SUMARISTA,
            ESTADO_AGENDAMENTO
          )
          VALUES (
            :examId,
            :invigilatorId,
            SYSDATE,
            1,
            :userId,
            :refInvigilator,
            :refUser,
            NULL,
            1
          )
          `,
          {
            examId,
            invigilatorId: Number(invigilator.ID),
            userId,
            refInvigilator: JSON.stringify({
              pk: Number(invigilator.ID),
              desc: invigilator.NOME,
              corLetra: 'black',
              disponivel: true,
            }),
            refUser,
          } as any,
        );
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Prova de Pos-Graduacao marcada com sucesso',
        data: { id: examId },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Valida ano, grau e curso opcional antes de executar consultas operacionais.
   */
  private async validateAcademicContext(
    academicYearId: number,
    degreeId: number,
    courseId?: number,
  ) {
    /*
     * As queries de existência separam ano e grau para devolver erros
     * específicos e restringem o grau aos códigos 2 e 3.
     */
    const [academicYears, degrees] = await Promise.all([
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT CODIGO
        FROM FK2_TB_ANO_LECTIVO
        WHERE CODIGO = :academicYearId
        FETCH FIRST 1 ROWS ONLY
        `,
        { academicYearId } as any,
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
        { degreeId } as any,
      ),
    ]);

    if (!academicYears.length) {
      throw new NotFoundException('Ano lectivo nao encontrado');
    }
    if (!degrees.length) {
      throw new NotFoundException('Grau de Pos-Graduacao nao encontrado');
    }

    if (courseId) {
      /*
       * SELECT opcional confirma que o curso está ativo e pertence ao grau
       * solicitado.
       */
      const courses = await this.dataSource.query<DatabaseRow[]>(
        `
        SELECT CODIGO
        FROM FK2_TB_CURSOS
        WHERE CODIGO = :courseId
          AND TIPO_CANDIDATURA = :degreeId
          AND STATUS_ = 1
        FETCH FIRST 1 ROWS ONLY
        `,
        { courseId, degreeId } as any,
      );
      if (!courses.length) {
        throw new NotFoundException(
          'Curso nao encontrado no grau de Pos-Graduacao informado',
        );
      }
    }
  }

  /**
   * Confirma que o utilizador responsável pela operação permanece ativo.
   */
  private async findActiveUser(userId: number, queryRunner: QueryRunner) {
    /*
     * SELECT de existência também devolve o nome usado na referência de
     * auditoria da prova.
     */
    const rows = (await queryRunner.query(
      `
      SELECT PK_UTILIZADOR AS ID, NOME
      FROM FK2_MCA_TB_UTILIZADOR
      WHERE PK_UTILIZADOR = :userId
        AND ACTIVE_STATE = 1
      FETCH FIRST 1 ROWS ONLY
      `,
      { userId } as any,
    )) as DatabaseRow[];

    if (!rows.length) {
      throw new ForbiddenException(
        'Utilizador autenticado nao encontrado ou inactivo',
      );
    }
    return rows[0];
  }

  /**
   * Valida e bloqueia o horário que será usado pela prova.
   */
  private async findAndLockSchedule(
    body: CreateExamMarkingDto,
    queryRunner: QueryRunner,
  ) {
    /*
     * SELECT cruza horário, grade e curso; WHERE exige correspondência integral
     * com o DTO e estados ativos; FOR UPDATE protege a criação concorrente.
     */
    const rows = (await queryRunner.query(
      `
      SELECT
        H.PK_HORARIO AS SCHEDULE_ID,
        H.DESIGNACAO AS SCHEDULE,
        H.CAPACIDADE AS SCHEDULE_CAPACITY,
        GC.CODIGO_DISCIPLINA AS CURRICULAR_UNIT_ID
      FROM FK2_MGH_TB_HORARIO H
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON GC.CODIGO = TO_NUMBER(NULLIF(H.FK_GRADE_CURRICULAR, ''))
      INNER JOIN FK2_TB_CURSOS C
        ON C.CODIGO = GC.CODIGO_CURSO
      WHERE H.PK_HORARIO = :scheduleId
        AND GC.CODIGO = :curricularGradeId
        AND GC.CODIGO_CURSO = :courseId
        AND C.TIPO_CANDIDATURA = :degreeId
        AND H.FK_ANO_LECTIVO = :academicYearId
        AND H.FK_SEMESTRE = :semesterId
        AND H.FK_PERIODO = :periodId
        AND H.ACTIVE_STATE = 1
        AND NVL(H.FK_ESTADO_HORARIO_WF, 0) <> 4
        AND GC.STATUS_ = 1
        AND C.STATUS_ = 1
      FOR UPDATE
      `,
      {
        scheduleId: body.scheduleId,
        curricularGradeId: body.curricularGradeId,
        courseId: body.courseId,
        degreeId: body.degreeId,
        academicYearId: body.academicYearId,
        semesterId: body.semesterId,
        periodId: body.periodId,
      } as any,
    )) as DatabaseRow[];

    if (!rows.length) {
      throw new NotFoundException(
        'Horario activo nao encontrado no contexto de Pos-Graduacao informado',
      );
    }
    return rows[0];
  }

  /**
   * Confirma que o utilizador é docente de uma aula ativa do horário.
   */
  private async validateScheduleTeacher(
    scheduleId: number,
    userId: number,
    queryRunner: QueryRunner,
  ) {
    /*
     * SELECT de existência consulta a aula do horário e interpreta o docente
     * guardado em REF_DOCENTE.
     */
    const rows = (await queryRunner.query(
      `
      SELECT 1
      FROM FK2_MGH_TB_AULA A
      WHERE A.FK_HORARIO = :scheduleId
        AND A.ACTIVE_STATE = 1
        AND JSON_VALUE(
          A.REF_DOCENTE,
          '$.pkDocente' RETURNING NUMBER NULL ON ERROR
        ) = :userId
      FETCH FIRST 1 ROWS ONLY
      `,
      { scheduleId, userId } as any,
    )) as DatabaseRow[];

    if (!rows.length) {
      throw new ForbiddenException(
        'O utilizador autenticado nao e docente activo deste horario',
      );
    }
  }

  /**
   * Obtém o prazo de marcação que está ativo e aberto na data corrente.
   */
  private async findOpenTerm(
    body: CreateExamMarkingDto,
    queryRunner: QueryRunner,
  ) {
    /*
     * SELECT recompõe prazo, tipo, semestre, ano e avaliação; WHERE exige tipo
     * de prazo 4, contexto correspondente e data atual dentro do intervalo.
     */
    const rows = (await queryRunner.query(
      `
      SELECT
        P.PK_PRAZO AS ID,
        P.FK_TIPO_AVALIACAO AS ASSESSMENT_TYPE_ID,
        TA.DESIGNACAO AS ASSESSMENT_TYPE,
        TP.DESIGNACAO AS TERM_TYPE,
        SEM.DESIGNACAO AS SEMESTER,
        ANO.DESIGNACAO AS ACADEMIC_YEAR
      FROM FK2_MCAL_TB_PRAZO P
      INNER JOIN FK2_MCAL_TB_TIPO_PRAZO TP
        ON TP.PK_TIPO_PRAZO = P.FK_TIPO_PRAZO
      INNER JOIN FK2_MCAL_TB_SEMESTRE SEM
        ON SEM.PK_SEMESTRE = P.FK_SEMESTRE
      INNER JOIN FK2_TB_ANO_LECTIVO ANO
        ON ANO.CODIGO = P.FK_ANO_LECTIVO
      LEFT JOIN FK2_MCAL_TB_TIPO_AVALIACAO TA
        ON TA.PK_TIPO_AVALIACAO = P.FK_TIPO_AVALIACAO
      WHERE P.PK_PRAZO = :termId
        AND P.FK_TIPO_PRAZO = 4
        AND P.FK_ANO_LECTIVO = :academicYearId
        AND P.FK_SEMESTRE = :semesterId
        AND P.TIPO_CANDIDATURA = :degreeId
        AND P.ACTIVE_STATE = 1
        AND P.DATA_INICIO <= P.DATA_FIM
        AND TRUNC(SYSDATE) BETWEEN TRUNC(P.DATA_INICIO)
            AND TRUNC(P.DATA_FIM)
      FETCH FIRST 1 ROWS ONLY
      `,
      {
        termId: body.termId,
        academicYearId: body.academicYearId,
        semesterId: body.semesterId,
        degreeId: body.degreeId,
      } as any,
    )) as DatabaseRow[];

    if (!rows.length) {
      throw new BadRequestException(
        'Nao existe um prazo aberto de marcacao de provas para o grau, ano e semestre informados',
      );
    }
    return rows[0];
  }

  /**
   * Valida os catálogos simples recebidos no pedido.
   */
  private async validateSimpleReferences(
    body: CreateExamMarkingDto,
    queryRunner: QueryRunner,
  ) {
    /*
     * As três queries de existência validam separadamente tipo de prova,
     * modalidade ativa e período ativo para produzir mensagens precisas.
     */
    const [examTypes, modalities, periods] = (await Promise.all([
      queryRunner.query(
        `
        SELECT CODIGO
        FROM FK2_TB_TIPO_PROVA
        WHERE CODIGO = :examTypeId
        FETCH FIRST 1 ROWS ONLY
        `,
        { examTypeId: body.examTypeId } as any,
      ),
      queryRunner.query(
        `
        SELECT PK_MODALIDADE
        FROM FK2_MGH_TB_MODALIDADE
        WHERE PK_MODALIDADE = :modalityId
          AND ACTIVE_STATE = 1
        FETCH FIRST 1 ROWS ONLY
        `,
        { modalityId: body.modalityId } as any,
      ),
      queryRunner.query(
        `
        SELECT CODIGO
        FROM FK2_TB_PERIODOS
        WHERE CODIGO = :periodId
          AND STATUS_ = 1
        FETCH FIRST 1 ROWS ONLY
        `,
        { periodId: body.periodId } as any,
      ),
    ])) as DatabaseRow[][];

    if (!examTypes.length) {
      throw new NotFoundException('Tipo de prova nao encontrado');
    }
    if (!modalities.length) {
      throw new NotFoundException('Modalidade activa nao encontrada');
    }
    if (!periods.length) {
      throw new NotFoundException('Periodo activo nao encontrado');
    }
  }

  /**
   * Confirma a disponibilidade da sala e compara sua capacidade com o número
   * de estudantes inscritos ou, na ausência deles, com a capacidade do horário.
   */
  private async validateRoomCapacity(
    body: CreateExamMarkingDto,
    schedule: DatabaseRow,
    queryRunner: QueryRunner,
  ) {
    /*
     * SELECT da sala exige registo não eliminado e marcado como utilizável.
     */
    const rooms = (await queryRunner.query(
      `
      SELECT CODIGO AS ID, CAPACIDADE
      FROM FK2_TB_SALAS
      WHERE CODIGO = :roomId
        AND DELETED_AT IS NULL
        AND UPPER(TRIM(UTILIZAVEL)) = 'SIM'
      FETCH FIRST 1 ROWS ONLY
      `,
      { roomId: body.roomId } as any,
    )) as DatabaseRow[];

    if (!rooms.length) {
      throw new NotFoundException(
        'Sala nao encontrada, inactiva ou indisponivel para utilizacao',
      );
    }

    /*
     * COUNT calcula estudantes distintos inscritos na grade, ano e horário nos
     * estados académicos aceites para dimensionar a sala.
     */
    const enrollmentRows = (await queryRunner.query(
      `
      SELECT COUNT(DISTINCT GCA.CODIGO_MATRICULA) AS TOTAL
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
      WHERE GCA.CODIGO_GRADE_CURRICULAR = :curricularGradeId
        AND GCA.CODIGO_ANO_LECTIVO = :academicYearId
        AND GCA.CODIGO_STATUS_GRADE_CURRICULAR IN (1, 2, 3)
        AND JSON_VALUE(
          GCA.REF_HORARIO,
          '$.pk' RETURNING NUMBER NULL ON ERROR
        ) = :scheduleId
      `,
      {
        curricularGradeId: body.curricularGradeId,
        academicYearId: body.academicYearId,
        scheduleId: body.scheduleId,
      } as any,
    )) as DatabaseRow[];

    const enrolledStudents = Number(enrollmentRows[0]?.TOTAL ?? 0);
    const scheduleCapacity = Number(schedule.SCHEDULE_CAPACITY ?? 0);
    const requiredCapacity =
      enrolledStudents > 0 ? enrolledStudents : scheduleCapacity;
    const roomCapacity = Number(rooms[0].CAPACIDADE ?? 0);

    if (requiredCapacity > 0 && roomCapacity < requiredCapacity) {
      throw new BadRequestException(
        'A sala seleccionada nao possui capacidade para os estudantes deste horario',
      );
    }
  }

  /**
   * Impede uma segunda prova para a mesma combinação de horário e prazo.
   */
  private async validateDuplicate(
    body: CreateExamMarkingDto,
    queryRunner: QueryRunner,
  ) {
    /*
     * SELECT interpreta REF_HORARIO e REF_PRAZO e encerra na primeira
     * combinação já existente.
     */
    const rows = (await queryRunner.query(
      `
      SELECT CP.CODIGO
      FROM FK2_TB_CALENDARIO_PROVA CP
      WHERE JSON_VALUE(
          CP.REF_HORARIO,
          '$.pk' RETURNING NUMBER NULL ON ERROR
        ) = :scheduleId
        AND JSON_VALUE(
          CP.REF_PRAZO,
          '$.pk_prazo' RETURNING NUMBER NULL ON ERROR
        ) = :termId
      FETCH FIRST 1 ROWS ONLY
      `,
      {
        scheduleId: body.scheduleId,
        termId: body.termId,
      } as any,
    )) as DatabaseRow[];

    if (rows.length) {
      throw new ConflictException(
        'Ja existe uma prova marcada para este horario e tipo de epoca',
      );
    }
  }

  /**
   * Impede a ocupação simultânea da mesma sala.
   */
  private async validateRoomConflict(
    body: CreateExamMarkingDto,
    queryRunner: QueryRunner,
  ) {
    /*
     * SELECT procura, na mesma data e sala, intervalos que se sobrepõem:
     * início existente < novo fim e fim existente > novo início.
     */
    const rows = (await queryRunner.query(
      `
      SELECT CP.CODIGO
      FROM FK2_TB_CALENDARIO_PROVA CP
      WHERE CP.CODIGO_SALA = :roomId
        AND TRUNC(CP.DATA_PROVA) = TO_DATE(:examDate, 'YYYY-MM-DD')
        AND TO_CHAR(CP.HORA_PROVA, 'HH24:MI') < :endTime
        AND TO_CHAR(CP.HORA_TERMINO, 'HH24:MI') > :startTime
      FETCH FIRST 1 ROWS ONLY
      `,
      {
        roomId: body.roomId,
        examDate: body.examDate,
        endTime: body.endTime,
        startTime: body.startTime,
      } as any,
    )) as DatabaseRow[];

    if (rows.length) {
      throw new ConflictException(
        'A sala seleccionada ja esta ocupada neste intervalo',
      );
    }
  }

  /**
   * Impede que o docente responsável tenha duas provas sobrepostas.
   */
  private async validateTeacherConflict(
    body: CreateExamMarkingDto,
    userId: number,
    queryRunner: QueryRunner,
  ) {
    /*
     * SELECT procura sobreposição de horário e usa EXISTS para identificar o
     * docente nas aulas ligadas ao horário de cada prova existente.
     */
    const rows = (await queryRunner.query(
      `
      SELECT CP.CODIGO
      FROM FK2_TB_CALENDARIO_PROVA CP
      WHERE TRUNC(CP.DATA_PROVA) = TO_DATE(:examDate, 'YYYY-MM-DD')
        AND TO_CHAR(CP.HORA_PROVA, 'HH24:MI') < :endTime
        AND TO_CHAR(CP.HORA_TERMINO, 'HH24:MI') > :startTime
        AND EXISTS (
          SELECT 1
          FROM FK2_MGH_TB_AULA A
          WHERE A.FK_HORARIO = JSON_VALUE(
              CP.REF_HORARIO,
              '$.pk' RETURNING NUMBER NULL ON ERROR
            )
            AND A.ACTIVE_STATE = 1
            AND JSON_VALUE(
              A.REF_DOCENTE,
              '$.pkDocente' RETURNING NUMBER NULL ON ERROR
            ) = :userId
        )
      FETCH FIRST 1 ROWS ONLY
      `,
      {
        examDate: body.examDate,
        endTime: body.endTime,
        startTime: body.startTime,
        userId,
      } as any,
    )) as DatabaseRow[];

    if (rows.length) {
      throw new ConflictException(
        'O docente ja possui outra prova neste intervalo',
      );
    }
  }

  /**
   * Resolve os utilizadores informados e exige que todos sejam docentes ativos.
   */
  private async findValidInvigilators(
    invigilatorUserIds: number[],
    queryRunner: QueryRunner,
  ) {
    if (!invigilatorUserIds.length) {
      return [];
    }

    const { placeholders, binds } = this.createInBinds(
      'invigilator',
      invigilatorUserIds,
    );
    /*
     * SELECT usa binds dinâmicos seguros no IN, exige utilizadores ativos e
     * comprova a existência da associação docente.
     */
    const rows = (await queryRunner.query(
      `
      SELECT DISTINCT U.PK_UTILIZADOR AS ID, U.NOME
      FROM FK2_MCA_TB_UTILIZADOR U
      WHERE U.PK_UTILIZADOR IN (${placeholders})
        AND U.ACTIVE_STATE = 1
        AND EXISTS (
          SELECT 1
          FROM FK2_MGD_TB_DOCENTE D
          WHERE JSON_VALUE(
            D.CODIGO_UTILIZADOR,
            '$.pk' RETURNING NUMBER NULL ON ERROR
          ) = U.PK_UTILIZADOR
        )
      `,
      binds as any,
    )) as DatabaseRow[];

    if (rows.length !== invigilatorUserIds.length) {
      throw new BadRequestException(
        'Um ou mais vigilantes nao existem ou nao sao docentes activos',
      );
    }
    return rows;
  }

  /**
   * Impede que um vigilante participe em provas simultâneas.
   */
  private async validateInvigilatorConflicts(
    body: CreateExamMarkingDto,
    queryRunner: QueryRunner,
  ) {
    if (!body.invigilatorUserIds.length) {
      return;
    }

    const { placeholders, binds } = this.createInBinds(
      'invigilator',
      body.invigilatorUserIds,
    );
    /*
     * SELECT cruza vínculo de vigilância e prova, restringe vigilantes ativos e
     * aplica a mesma regra de sobreposição de data e horas.
     */
    const rows = (await queryRunner.query(
      `
      SELECT V.VIGILANTE
      FROM FK2_TB_CALENDARIO_PROVA_VIGILANTE V
      INNER JOIN FK2_TB_CALENDARIO_PROVA CP
        ON CP.CODIGO = V.CALENDARIO_PROVA
      WHERE V.VIGILANTE IN (${placeholders})
        AND V.STATUS_ = 1
        AND TRUNC(CP.DATA_PROVA) = TO_DATE(:examDate, 'YYYY-MM-DD')
        AND TO_CHAR(CP.HORA_PROVA, 'HH24:MI') < :endTime
        AND TO_CHAR(CP.HORA_TERMINO, 'HH24:MI') > :startTime
      FETCH FIRST 1 ROWS ONLY
      `,
      {
        ...binds,
        examDate: body.examDate,
        endTime: body.endTime,
        startTime: body.startTime,
      } as any,
    )) as DatabaseRow[];

    if (rows.length) {
      throw new ConflictException(
        'Um dos vigilantes seleccionados ja esta associado a outra prova neste intervalo',
      );
    }
  }

  /**
   * Carrega os vigilantes das provas paginadas e os agrupa por prova.
   */
  private async findInvigilatorsByExam(examIds: number[]) {
    const result = new Map<number, Array<{ id: number; name: unknown }>>();
    if (!examIds.length) {
      return result;
    }

    const { placeholders, binds } = this.createInBinds('exam', examIds);
    /*
     * SELECT obtém vínculos ativos e usa COALESCE para preferir o nome atual do
     * utilizador, mantendo a referência JSON como fallback histórico.
     */
    const rows = await this.dataSource.query<DatabaseRow[]>(
      `
      SELECT
        V.CALENDARIO_PROVA AS EXAM_ID,
        V.VIGILANTE AS ID,
        COALESCE(
          U.NOME,
          JSON_VALUE(V.REF_VIGILANTE, '$.desc' NULL ON ERROR)
        ) AS NAME
      FROM FK2_TB_CALENDARIO_PROVA_VIGILANTE V
      LEFT JOIN FK2_MCA_TB_UTILIZADOR U
        ON U.PK_UTILIZADOR = V.VIGILANTE
      WHERE V.CALENDARIO_PROVA IN (${placeholders})
        AND V.STATUS_ = 1
      ORDER BY V.CALENDARIO_PROVA, NAME
      `,
      binds as any,
    );

    rows.forEach((row) => {
      const examId = Number(row.EXAM_ID);
      const current = result.get(examId) ?? [];
      current.push({ id: Number(row.ID), name: row.NAME });
      result.set(examId, current);
    });
    return result;
  }

  /**
   * Cria placeholders nomeados e binds separados para listas usadas em `IN`.
   */
  private createInBinds(prefix: string, values: number[]) {
    const binds: Record<string, number> = {};
    const placeholders = values
      .map((value, index) => {
        const key = `${prefix}${index}`;
        binds[key] = value;
        return `:${key}`;
      })
      .join(', ');

    return { placeholders, binds };
  }

  /**
   * Converte `HH:mm` em minutos para validar e persistir a duração.
   */
  private timeToMinutes(value: string) {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Converte números Oracle sem transformar valores ausentes em zero.
   */
  private toNullableNumber(value: unknown) {
    return value === null || value === undefined ? null : Number(value);
  }
}
