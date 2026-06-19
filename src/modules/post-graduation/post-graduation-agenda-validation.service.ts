import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { FindAgendaValidationOptionsDto } from './dto/find-agenda-validation-options.dto';
import { FindAgendaValidationsDto } from './dto/find-agenda-validations.dto';
import { FindMissingAgendaValidationsDto } from './dto/find-missing-agenda-validations.dto';
import { UpdateAgendaValidationStatusDto } from './dto/update-agenda-validation-status.dto';

type DatabaseRow = Record<string, unknown>;

const COORDINATOR_ROLE_ID = 9;
const PENDING_STATUS_ID = 1;

/**
 * Disponibiliza ao coordenador as pautas dos seus cursos, identifica UCs sem
 * pauta e controla a decisão transacional de aprovação ou rejeição.
 */
@Injectable()
export class PostGraduationAgendaValidationService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Monta opções de filtro limitadas aos cursos coordenados pelo utilizador e
   * ao contexto académico selecionado.
   */
  async findOptions(filters: FindAgendaValidationOptionsDto, userId: number) {
    await this.validateBaseContext(filters.academicYearId, filters.degreeId);

    if (filters.courseId) {
      await this.validateCourseCoordinator(
        userId,
        filters.courseId,
        filters.degreeId,
        this.dataSource,
      );
    }

    const courseParams = {
      degreeId: filters.degreeId,
      courseId: filters.courseId ?? null,
      userId,
      coordinatorRoleId: COORDINATOR_ROLE_ID,
    };
    const contextParams = {
      academicYearId: filters.academicYearId,
      degreeId: filters.degreeId,
      semesterId: filters.semesterId,
      courseId: filters.courseId ?? null,
      userId,
      coordinatorRoleId: COORDINATOR_ROLE_ID,
    };

    /*
     * Queries independentes:
     * - cursos: vínculos ativos do coordenador;
     * - contextos: anos curriculares e UCs com horário válido;
     * - avaliações: tipos já usados em pautas do contexto;
     * - estados: catálogo de estados da pauta.
     */
    const [courses, contexts, assessmentTypes, statuses] = await Promise.all([
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT DISTINCT
          C.CODIGO AS ID,
          C.DESIGNACAO AS DESIGNATION
        FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS CA
        INNER JOIN FK2_TB_CURSOS C
          ON C.CODIGO = CA.FK_CURSO
        WHERE CA.FK_UTILIZADOR = :userId
          AND CA.FK_TIPO_CARGO = :coordinatorRoleId
          AND CA.ACTIVE = 1
          AND C.TIPO_CANDIDATURA = :degreeId
          AND C.TIPO_CANDIDATURA IN (2, 3)
          AND C.STATUS_ = 1
          AND (:courseId IS NULL OR C.CODIGO = :courseId)
        ORDER BY C.DESIGNACAO
        `,
        courseParams as unknown as any[],
      ),
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT DISTINCT
          C.CODIGO AS COURSE_ID,
          GC.CODIGO_CLASSE AS CURRICULAR_YEAR_ID,
          CL.DESIGNACAO AS CURRICULAR_YEAR,
          GC.CODIGO AS CURRICULAR_GRADE_ID,
          D.CODIGO AS CURRICULAR_UNIT_ID,
          D.DESIGNACAO AS CURRICULAR_UNIT
        FROM FK2_MGH_TB_HORARIO H
        INNER JOIN FK2_TB_GRADE_CURRICULAR GC
          ON GC.CODIGO = TO_NUMBER(NULLIF(H.FK_GRADE_CURRICULAR, ''))
        INNER JOIN FK2_TB_DISCIPLINAS D
          ON D.CODIGO = GC.CODIGO_DISCIPLINA
        INNER JOIN FK2_TB_CURSOS C
          ON C.CODIGO = GC.CODIGO_CURSO
        INNER JOIN FK2_TB_CLASSES CL
          ON CL.CODIGO = GC.CODIGO_CLASSE
        WHERE H.FK_ANO_LECTIVO = :academicYearId
          AND H.FK_SEMESTRE = :semesterId
          AND C.TIPO_CANDIDATURA = :degreeId
          AND C.TIPO_CANDIDATURA IN (2, 3)
          AND (:courseId IS NULL OR C.CODIGO = :courseId)
          AND H.ACTIVE_STATE = 1
          AND NVL(H.FK_ESTADO_HORARIO_WF, 0) <> 4
          AND GC.STATUS_ = 1
          AND C.STATUS_ = 1
          AND EXISTS (
            SELECT 1
            FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS CA
            WHERE CA.FK_UTILIZADOR = :userId
              AND CA.FK_CURSO = C.CODIGO
              AND CA.FK_TIPO_CARGO = :coordinatorRoleId
              AND CA.ACTIVE = 1
          )
        ORDER BY
          C.CODIGO,
          CURRICULAR_YEAR_ID,
          CURRICULAR_UNIT
        `,
        contextParams as unknown as any[],
      ),
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT DISTINCT
          TA.PK_TIPO_AVALIACAO AS ID,
          TA.DESIGNACAO AS DESIGNATION
        FROM FK2_MGD_TB_LANCAMENTO_PAUTA LP
        INNER JOIN FK2_TB_GRADE_CURRICULAR GC
          ON GC.CODIGO = JSON_VALUE(
            LP.REF_GRADE_CURRICULAR,
            '$.pk' RETURNING NUMBER NULL ON ERROR
          )
        INNER JOIN FK2_TB_CURSOS C
          ON C.CODIGO = GC.CODIGO_CURSO
        INNER JOIN FK2_MCAL_TB_TIPO_AVALIACAO TA
          ON TA.PK_TIPO_AVALIACAO = LP.FK_TIPO_AVALIACAO
        WHERE JSON_VALUE(
            LP.REF_ANO_LECTIVO,
            '$.pk' RETURNING NUMBER NULL ON ERROR
          ) = :academicYearId
          AND GC.CODIGO_SEMESTRE = :semesterId
          AND C.TIPO_CANDIDATURA = :degreeId
          AND C.TIPO_CANDIDATURA IN (2, 3)
          AND (:courseId IS NULL OR C.CODIGO = :courseId)
          AND LP.ACTIVE_STATE = 1
          AND GC.STATUS_ = 1
          AND C.STATUS_ = 1
          AND EXISTS (
            SELECT 1
            FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS CA
            WHERE CA.FK_UTILIZADOR = :userId
              AND CA.FK_CURSO = C.CODIGO
              AND CA.FK_TIPO_CARGO = :coordinatorRoleId
              AND CA.ACTIVE = 1
          )
        ORDER BY TA.DESIGNACAO
        `,
        contextParams as unknown as any[],
      ),
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT
          PK_ESTADO AS ID,
          DESIGNACAO AS DESIGNATION
        FROM FK2_MGD_ESTADO_LANCAMENTO_PAUTA
        ORDER BY PK_ESTADO
        `,
      ),
    ]);

    const curricularYears = new Map<
      string,
      { id: number; designation: unknown; courseId: number }
    >();

    contexts.forEach((row) => {
      const courseId = Number(row.COURSE_ID);
      const curricularYearId = Number(row.CURRICULAR_YEAR_ID);

      curricularYears.set(`${courseId}:${curricularYearId}`, {
        id: curricularYearId,
        designation: row.CURRICULAR_YEAR,
        courseId,
      });
    });

    return {
      data: {
        courses: courses.map((row) => ({
          id: Number(row.ID),
          designation: row.DESIGNATION,
        })),
        curricularYears: [...curricularYears.values()],
        curricularUnits: contexts.map((row) => ({
          curricularGradeId: Number(row.CURRICULAR_GRADE_ID),
          curricularUnitId: Number(row.CURRICULAR_UNIT_ID),
          designation: row.CURRICULAR_UNIT,
          courseId: Number(row.COURSE_ID),
          curricularYearId: Number(row.CURRICULAR_YEAR_ID),
        })),
        assessmentTypes: assessmentTypes.map((row) => ({
          id: Number(row.ID),
          designation: row.DESIGNATION,
        })),
        statuses: statuses.map((row) => ({
          id: Number(row.ID),
          designation: row.DESIGNATION,
        })),
      },
    };
  }

  /**
   * Lista as pautas submetidas apenas nos cursos em que o utilizador é
   * coordenador ativo.
   */
  async findAll(filters: FindAgendaValidationsDto, userId: number) {
    await this.validateBaseContext(filters.academicYearId, filters.degreeId);

    if (filters.courseId) {
      await this.validateCourseCoordinator(
        userId,
        filters.courseId,
        filters.degreeId,
        this.dataSource,
      );
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;
    const params: Record<string, number> = {
      academicYearId: filters.academicYearId,
      degreeId: filters.degreeId,
      semesterId: filters.semesterId,
      userId,
      coordinatorRoleId: COORDINATOR_ROLE_ID,
    };
    const conditions = [
      `JSON_VALUE(
        LP.REF_ANO_LECTIVO,
        '$.pk' RETURNING NUMBER NULL ON ERROR
      ) = :academicYearId`,
      'GC.CODIGO_SEMESTRE = :semesterId',
      'C.TIPO_CANDIDATURA = :degreeId',
      'C.TIPO_CANDIDATURA IN (2, 3)',
      'LP.ACTIVE_STATE = 1',
      'GC.STATUS_ = 1',
      'C.STATUS_ = 1',
      `EXISTS (
        SELECT 1
        FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS CA
        WHERE CA.FK_UTILIZADOR = :userId
          AND CA.FK_CURSO = C.CODIGO
          AND CA.FK_TIPO_CARGO = :coordinatorRoleId
          AND CA.ACTIVE = 1
      )`,
    ];

    this.addOptionalFilter(
      conditions,
      params,
      filters.courseId,
      'C.CODIGO = :courseId',
      'courseId',
    );
    this.addOptionalFilter(
      conditions,
      params,
      filters.curricularYearId,
      'GC.CODIGO_CLASSE = :curricularYearId',
      'curricularYearId',
    );
    this.addOptionalFilter(
      conditions,
      params,
      filters.curricularGradeId,
      'GC.CODIGO = :curricularGradeId',
      'curricularGradeId',
    );
    this.addOptionalFilter(
      conditions,
      params,
      filters.assessmentTypeId,
      'LP.FK_TIPO_AVALIACAO = :assessmentTypeId',
      'assessmentTypeId',
    );
    this.addOptionalFilter(
      conditions,
      params,
      filters.statusId,
      'LP.FK_ESTADO_LANCAMENTO_PAUTA = :statusId',
      'statusId',
    );

    /*
     * Bloco relacional compartilhado:
     * - JOIN recompõe curso, UC, ano, semestre e tipo de avaliação;
     * - EXISTS aplica a responsabilidade institucional do coordenador;
     * - LEFT JOIN resolve estado e utilizador validador quando existem;
     * - DBMS_LOB.SUBSTR converte o identificador legado armazenado em CLOB.
     */
    const fromAndWhere = `
      FROM FK2_MGD_TB_LANCAMENTO_PAUTA LP
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON GC.CODIGO = JSON_VALUE(
          LP.REF_GRADE_CURRICULAR,
          '$.pk' RETURNING NUMBER NULL ON ERROR
        )
      INNER JOIN FK2_TB_DISCIPLINAS D
        ON D.CODIGO = GC.CODIGO_DISCIPLINA
      INNER JOIN FK2_TB_CURSOS C
        ON C.CODIGO = GC.CODIGO_CURSO
      INNER JOIN FK2_TB_CLASSES CL
        ON CL.CODIGO = GC.CODIGO_CLASSE
      INNER JOIN FK2_TB_SEMESTRES S
        ON S.CODIGO = GC.CODIGO_SEMESTRE
      INNER JOIN FK2_TB_ANO_LECTIVO AL
        ON AL.CODIGO = JSON_VALUE(
          LP.REF_ANO_LECTIVO,
          '$.pk' RETURNING NUMBER NULL ON ERROR
        )
      INNER JOIN FK2_MCAL_TB_TIPO_AVALIACAO TA
        ON TA.PK_TIPO_AVALIACAO = LP.FK_TIPO_AVALIACAO
      LEFT JOIN FK2_MGD_ESTADO_LANCAMENTO_PAUTA ES
        ON ES.PK_ESTADO = LP.FK_ESTADO_LANCAMENTO_PAUTA
      LEFT JOIN FK2_MCA_TB_UTILIZADOR UV
        ON UV.PK_UTILIZADOR = TO_NUMBER(
          DBMS_LOB.SUBSTR(LP.FK_USER_VALIDACAO, 100, 1)
          DEFAULT NULL ON CONVERSION ERROR
        )
      WHERE ${conditions.join('\n        AND ')}
    `;

    /*
     * A contagem e os dados usam os mesmos filtros. A listagem acrescenta
     * auditoria, ordenação por submissão e paginação.
     */
    const [countRows, rows] = await Promise.all([
      this.dataSource.query<DatabaseRow[]>(
        `SELECT COUNT(*) AS TOTAL ${fromAndWhere}`,
        params as unknown as any[],
      ),
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT
          LP.PK_LANCAMENTO_PAUTA AS ID,
          LP.CREATED_AT,
          LP.UPDATED_AT,
          LP.FICHEIRO_NAME AS FILE_NAME,
          LP.FK_ESTADO_LANCAMENTO_PAUTA AS STATUS_ID,
          ES.DESIGNACAO AS STATUS,
          LP.FK_TIPO_AVALIACAO AS ASSESSMENT_TYPE_ID,
          TA.DESIGNACAO AS ASSESSMENT_TYPE,
          AL.CODIGO AS ACADEMIC_YEAR_ID,
          AL.DESIGNACAO AS ACADEMIC_YEAR,
          C.CODIGO AS COURSE_ID,
          C.DESIGNACAO AS COURSE,
          CL.CODIGO AS CURRICULAR_YEAR_ID,
          CL.DESIGNACAO AS CURRICULAR_YEAR,
          S.CODIGO AS SEMESTER_ID,
          S.DESIGNACAO AS SEMESTER,
          GC.CODIGO AS CURRICULAR_GRADE_ID,
          D.CODIGO AS CURRICULAR_UNIT_ID,
          D.DESIGNACAO AS CURRICULAR_UNIT,
          JSON_VALUE(LP.REF_DOCENTE, '$.desc') AS TEACHER,
          TO_NUMBER(
            DBMS_LOB.SUBSTR(LP.FK_USER_VALIDACAO, 100, 1)
            DEFAULT NULL ON CONVERSION ERROR
          ) AS VALIDATED_BY_ID,
          UV.NOME AS VALIDATED_BY
        ${fromAndWhere}
        ORDER BY LP.CREATED_AT DESC, LP.PK_LANCAMENTO_PAUTA DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        `,
        { ...params, offset, limit } as unknown as any[],
      ),
    ]);

    const total = Number(countRows[0]?.TOTAL ?? 0);

    return {
      data: rows.map((row) => ({
        id: Number(row.ID),
        createdAt: row.CREATED_AT,
        updatedAt: row.UPDATED_AT,
        fileName: row.FILE_NAME,
        statusId: Number(row.STATUS_ID),
        status: row.STATUS,
        assessmentTypeId: Number(row.ASSESSMENT_TYPE_ID),
        assessmentType: row.ASSESSMENT_TYPE,
        academicYearId: Number(row.ACADEMIC_YEAR_ID),
        academicYear: row.ACADEMIC_YEAR,
        courseId: Number(row.COURSE_ID),
        course: row.COURSE,
        curricularYearId: Number(row.CURRICULAR_YEAR_ID),
        curricularYear: row.CURRICULAR_YEAR,
        semesterId: Number(row.SEMESTER_ID),
        semester: row.SEMESTER,
        curricularGradeId: Number(row.CURRICULAR_GRADE_ID),
        curricularUnitId: Number(row.CURRICULAR_UNIT_ID),
        curricularUnit: row.CURRICULAR_UNIT,
        teacher: row.TEACHER,
        validatedById:
          row.VALIDATED_BY_ID == null ? null : Number(row.VALIDATED_BY_ID),
        validatedBy: row.VALIDATED_BY,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Lista UCs ofertadas nos cursos coordenados que ainda não possuem nenhuma
   * pauta ativa no ano letivo.
   */
  async findMissing(filters: FindMissingAgendaValidationsDto, userId: number) {
    await this.validateBaseContext(filters.academicYearId, filters.degreeId);

    if (filters.courseId) {
      await this.validateCourseCoordinator(
        userId,
        filters.courseId,
        filters.degreeId,
        this.dataSource,
      );
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;
    const params: Record<string, number> = {
      academicYearId: filters.academicYearId,
      degreeId: filters.degreeId,
      semesterId: filters.semesterId,
      userId,
      coordinatorRoleId: COORDINATOR_ROLE_ID,
    };
    const conditions = [
      'H.FK_ANO_LECTIVO = :academicYearId',
      'H.FK_SEMESTRE = :semesterId',
      'C.TIPO_CANDIDATURA = :degreeId',
      'C.TIPO_CANDIDATURA IN (2, 3)',
      'H.ACTIVE_STATE = 1',
      'NVL(H.FK_ESTADO_HORARIO_WF, 0) <> 4',
      'GC.STATUS_ = 1',
      'C.STATUS_ = 1',
      `EXISTS (
        SELECT 1
        FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS CA
        WHERE CA.FK_UTILIZADOR = :userId
          AND CA.FK_CURSO = C.CODIGO
          AND CA.FK_TIPO_CARGO = :coordinatorRoleId
          AND CA.ACTIVE = 1
      )`,
      `NOT EXISTS (
        SELECT 1
        FROM FK2_MGD_TB_LANCAMENTO_PAUTA LP
        WHERE JSON_VALUE(
            LP.REF_GRADE_CURRICULAR,
            '$.pk' RETURNING NUMBER NULL ON ERROR
          ) = GC.CODIGO
          AND JSON_VALUE(
            LP.REF_ANO_LECTIVO,
            '$.pk' RETURNING NUMBER NULL ON ERROR
          ) = :academicYearId
          AND LP.ACTIVE_STATE = 1
      )`,
    ];

    this.addOptionalFilter(
      conditions,
      params,
      filters.courseId,
      'C.CODIGO = :courseId',
      'courseId',
    );
    this.addOptionalFilter(
      conditions,
      params,
      filters.curricularYearId,
      'GC.CODIGO_CLASSE = :curricularYearId',
      'curricularYearId',
    );
    this.addOptionalFilter(
      conditions,
      params,
      filters.curricularGradeId,
      'GC.CODIGO = :curricularGradeId',
      'curricularGradeId',
    );

    /*
     * Query de pendências:
     * - JOIN parte dos horários para identificar UCs efetivamente ofertadas;
     * - EXISTS restringe aos cursos coordenados;
     * - NOT EXISTS elimina grades que já possuem pauta ativa no ano;
     * - LEFT JOIN obtém o docente sem excluir UCs ainda sem aula associada;
     * - GROUP BY consolida eventuais múltiplos horários/aulas da mesma grade.
     */
    const baseQuery = `
      SELECT
        GC.CODIGO AS CURRICULAR_GRADE_ID,
        D.CODIGO AS CURRICULAR_UNIT_ID,
        D.DESIGNACAO AS CURRICULAR_UNIT,
        C.CODIGO AS COURSE_ID,
        C.DESIGNACAO AS COURSE,
        CL.CODIGO AS CURRICULAR_YEAR_ID,
        CL.DESIGNACAO AS CURRICULAR_YEAR,
        S.CODIGO AS SEMESTER_ID,
        S.DESIGNACAO AS SEMESTER,
        MAX(JSON_VALUE(A.REF_DOCENTE, '$.nome')) AS TEACHER
      FROM FK2_MGH_TB_HORARIO H
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON GC.CODIGO = TO_NUMBER(NULLIF(H.FK_GRADE_CURRICULAR, ''))
      INNER JOIN FK2_TB_DISCIPLINAS D
        ON D.CODIGO = GC.CODIGO_DISCIPLINA
      INNER JOIN FK2_TB_CURSOS C
        ON C.CODIGO = GC.CODIGO_CURSO
      INNER JOIN FK2_TB_CLASSES CL
        ON CL.CODIGO = GC.CODIGO_CLASSE
      INNER JOIN FK2_TB_SEMESTRES S
        ON S.CODIGO = GC.CODIGO_SEMESTRE
      LEFT JOIN FK2_MGH_TB_AULA A
        ON A.FK_HORARIO = H.PK_HORARIO
        AND A.ACTIVE_STATE = 1
      WHERE ${conditions.join('\n        AND ')}
      GROUP BY
        GC.CODIGO,
        D.CODIGO,
        D.DESIGNACAO,
        C.CODIGO,
        C.DESIGNACAO,
        CL.CODIGO,
        CL.DESIGNACAO,
        S.CODIGO,
        S.DESIGNACAO
    `;

    /*
     * A consulta externa conta ou pagina o mesmo conjunto agrupado, evitando
     * que duplicidades de horário distorçam o total de UCs pendentes.
     */
    const [countRows, rows] = await Promise.all([
      this.dataSource.query<DatabaseRow[]>(
        `SELECT COUNT(*) AS TOTAL FROM (${baseQuery})`,
        params as unknown as any[],
      ),
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT *
        FROM (${baseQuery})
        ORDER BY COURSE, CURRICULAR_YEAR_ID, CURRICULAR_UNIT
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        `,
        { ...params, offset, limit } as unknown as any[],
      ),
    ]);

    const total = Number(countRows[0]?.TOTAL ?? 0);

    return {
      data: rows.map((row) => ({
        curricularGradeId: Number(row.CURRICULAR_GRADE_ID),
        curricularUnitId: Number(row.CURRICULAR_UNIT_ID),
        curricularUnit: row.CURRICULAR_UNIT,
        courseId: Number(row.COURSE_ID),
        course: row.COURSE,
        curricularYearId: Number(row.CURRICULAR_YEAR_ID),
        curricularYear: row.CURRICULAR_YEAR,
        semesterId: Number(row.SEMESTER_ID),
        semester: row.SEMESTER,
        teacher: row.TEACHER,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Aprova ou rejeita uma pauta pendente dentro de transação e registra o
   * coordenador responsável pela decisão.
   */
  async updateStatus(
    agendaId: number,
    body: UpdateAgendaValidationStatusDto,
    userId: number,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      /*
       * SELECT localiza pauta, curso e grau; JOIN valida a referência da grade;
       * FOR UPDATE bloqueia especificamente o estado para impedir duas decisões
       * concorrentes sobre a mesma pauta.
       */
      const rows = (await queryRunner.query(
        `
        SELECT
          LP.PK_LANCAMENTO_PAUTA AS ID,
          LP.FK_ESTADO_LANCAMENTO_PAUTA AS STATUS_ID,
          GC.CODIGO_CURSO AS COURSE_ID,
          C.TIPO_CANDIDATURA AS DEGREE_ID
        FROM FK2_MGD_TB_LANCAMENTO_PAUTA LP
        INNER JOIN FK2_TB_GRADE_CURRICULAR GC
          ON GC.CODIGO = JSON_VALUE(
            LP.REF_GRADE_CURRICULAR,
            '$.pk' RETURNING NUMBER NULL ON ERROR
          )
        INNER JOIN FK2_TB_CURSOS C
          ON C.CODIGO = GC.CODIGO_CURSO
        WHERE LP.PK_LANCAMENTO_PAUTA = :agendaId
          AND LP.ACTIVE_STATE = 1
          AND GC.STATUS_ = 1
          AND C.STATUS_ = 1
          AND C.TIPO_CANDIDATURA IN (2, 3)
        FOR UPDATE OF LP.FK_ESTADO_LANCAMENTO_PAUTA
        `,
        { agendaId } as unknown as any[],
      )) as DatabaseRow[];

      if (!rows.length) {
        throw new NotFoundException(
          'Pauta activa de Pos-Graduacao nao encontrada',
        );
      }

      const agenda = rows[0];
      if (Number(agenda.STATUS_ID) !== PENDING_STATUS_ID) {
        throw new BadRequestException(
          'Apenas pautas pendentes podem ser aprovadas ou rejeitadas',
        );
      }

      await this.validateCourseCoordinator(
        userId,
        Number(agenda.COURSE_ID),
        Number(agenda.DEGREE_ID),
        queryRunner,
      );

      /*
       * UPDATE usa o estado pendente também no WHERE como proteção adicional.
       * O utilizador é convertido para CLOB porque FK_USER_VALIDACAO possui esse
       * tipo físico no esquema legado.
       */
      await queryRunner.query(
        `
        UPDATE FK2_MGD_TB_LANCAMENTO_PAUTA
        SET
          FK_ESTADO_LANCAMENTO_PAUTA = :statusId,
          FK_USER_VALIDACAO = TO_CLOB(TO_CHAR(:userId)),
          UPDATED_AT = SYSDATE
        WHERE PK_LANCAMENTO_PAUTA = :agendaId
          AND FK_ESTADO_LANCAMENTO_PAUTA = :pendingStatusId
          AND ACTIVE_STATE = 1
        `,
        {
          agendaId,
          statusId: body.statusId,
          userId,
          pendingStatusId: PENDING_STATUS_ID,
        } as unknown as any[],
      );

      await queryRunner.commitTransaction();

      return {
        message:
          body.statusId === 2
            ? 'Pauta de Pos-Graduacao aprovada com sucesso'
            : 'Pauta de Pos-Graduacao rejeitada com sucesso',
        data: {
          id: agendaId,
          statusId: body.statusId,
          validatedById: userId,
        },
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Confirma a existência do ano e de um grau ativo de Mestrado/Doutoramento.
   */
  private async validateBaseContext(academicYearId: number, degreeId: number) {
    /*
     * Queries de existência independentes permitem distinguir ano inexistente
     * de grau inválido sem consultar dados transacionais.
     */
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
      throw new NotFoundException('Ano lectivo nao encontrado');
    }
    if (!degrees.length) {
      throw new NotFoundException('Grau de Pos-Graduacao nao encontrado');
    }
  }

  /**
   * Confirma que o utilizador possui vínculo ativo de coordenador no curso e
   * que o curso pertence ao grau de Pós-Graduação informado.
   */
  private async validateCourseCoordinator(
    userId: number,
    courseId: number,
    degreeId: number,
    executor: Pick<DataSource, 'query'> | Pick<QueryRunner, 'query'>,
  ) {
    /*
     * SELECT cruza cargo e curso; WHERE exige utilizador, curso, cargo 9,
     * vínculo ativo, grau correspondente e curso ativo.
     */
    const rows = (await executor.query(
      `
      SELECT CA.PK_CARGO
      FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS CA
      INNER JOIN FK2_TB_CURSOS C
        ON C.CODIGO = CA.FK_CURSO
      WHERE CA.FK_UTILIZADOR = :userId
        AND CA.FK_CURSO = :courseId
        AND CA.FK_TIPO_CARGO = :coordinatorRoleId
        AND CA.ACTIVE = 1
        AND C.TIPO_CANDIDATURA = :degreeId
        AND C.TIPO_CANDIDATURA IN (2, 3)
        AND C.STATUS_ = 1
      FETCH FIRST 1 ROWS ONLY
      `,
      {
        userId,
        courseId,
        degreeId,
        coordinatorRoleId: COORDINATOR_ROLE_ID,
      } as unknown as any[],
    )) as DatabaseRow[];

    if (!rows.length) {
      throw new ForbiddenException(
        'O utilizador autenticado nao e coordenador activo deste curso de Pos-Graduacao',
      );
    }
  }

  /**
   * Adiciona um filtro SQL e o respetivo bind somente quando há valor.
   */
  private addOptionalFilter(
    conditions: string[],
    params: Record<string, number>,
    value: number | undefined,
    condition: string,
    paramName: string,
  ) {
    if (value == null) return;

    conditions.push(condition);
    params[paramName] = value;
  }
}
