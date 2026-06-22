import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as oracledb from 'oracledb';
import { DataSource, QueryRunner } from 'typeorm';
import { CreateAgendaLaunchDto } from './dto/create-agenda-launch.dto';
import { FindAgendaLaunchOptionsDto } from './dto/find-agenda-launch-options.dto';
import { FindAgendaLaunchesDto } from './dto/find-agenda-launches.dto';

type DatabaseRow = Record<string, unknown>;

type TeacherRow = DatabaseRow & {
  TEACHER_ID: number;
  TEACHER_NAME: string;
};

type AcademicContextRow = DatabaseRow & {
  ACADEMIC_YEAR: string;
  COURSE: string;
  CURRICULAR_GRADE_ID: number;
  CURRICULAR_UNIT: string;
};

/**
 * Controla a consulta e a submissão de pautas pelo docente, mantendo o fluxo
 * restrito às UCs que lhe foram atribuídas na Pós-Graduação.
 */
@Injectable()
export class PostGraduationAgendaLaunchService {
  private static readonly INITIAL_STATUS_ID = 1;

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Monta as opções dependentes do docente e os prazos/estados necessários ao
   * formulário e aos filtros de lançamento de pauta.
   */
  async findOptions(filters: FindAgendaLaunchOptionsDto, userId: number) {
    await this.validateAcademicContext(
      filters.academicYearId,
      filters.degreeId,
      filters.courseId,
    );

    const params = {
      academicYearId: filters.academicYearId,
      degreeId: filters.degreeId,
      semesterId: filters.semesterId,
      courseId: filters.courseId ?? null,
      userId,
    };
    const termParams = {
      academicYearId: filters.academicYearId,
      degreeId: filters.degreeId,
      semesterId: filters.semesterId,
    };

    /*
     * As três queries são independentes:
     * - contextos: cursos, anos curriculares e UCs atribuídos ao docente;
     * - prazos: janelas de lançamento e respetivos tipos de avaliação;
     * - estados: catálogo usado na consulta das pautas.
     */
    const [contexts, terms, statuses] = await Promise.all([
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT DISTINCT
          C.CODIGO AS COURSE_ID,
          C.DESIGNACAO AS COURSE,
          GC.CODIGO_CLASSE AS CURRICULAR_YEAR_ID,
          CL.DESIGNACAO AS CURRICULAR_YEAR,
          GC.CODIGO AS CURRICULAR_GRADE_ID,
          D.CODIGO AS CURRICULAR_UNIT_ID,
          DBMS_LOB.SUBSTR(D.DESIGNACAO, 4000, 1) AS CURRICULAR_UNIT
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
          CURRICULAR_YEAR_ID,
          CURRICULAR_UNIT
        `,
        params as unknown as any[],
      ),
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT
          P.PK_PRAZO AS TERM_ID,
          P.FK_TIPO_AVALIACAO AS ASSESSMENT_TYPE_ID,
          TA.DESIGNACAO AS ASSESSMENT_TYPE,
          P.DATA_INICIO AS START_DATE,
          P.DATA_FIM AS END_DATE,
          CASE
            WHEN P.DATA_INICIO <= P.DATA_FIM
              AND TRUNC(SYSDATE) BETWEEN TRUNC(P.DATA_INICIO)
                AND TRUNC(P.DATA_FIM)
            THEN 1
            ELSE 0
          END AS IS_OPEN
        FROM FK2_MCAL_TB_PRAZO P
        INNER JOIN FK2_MCAL_TB_TIPO_PRAZO TP
          ON TP.PK_TIPO_PRAZO = P.FK_TIPO_PRAZO
        INNER JOIN FK2_MCAL_TB_TIPO_AVALIACAO TA
          ON TA.PK_TIPO_AVALIACAO = P.FK_TIPO_AVALIACAO
        WHERE P.FK_ANO_LECTIVO = :academicYearId
          AND P.FK_SEMESTRE = :semesterId
          AND P.TIPO_CANDIDATURA = :degreeId
          AND TP.SIGLA = 'LN'
          AND P.ACTIVE_STATE = 1
        ORDER BY P.DATA_INICIO, TA.DESIGNACAO
        `,
        termParams as unknown as any[],
      ),
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT
          PK_ESTADO AS ID,
          DESIGNACAO
        FROM FK2_MGD_ESTADO_LANCAMENTO_PAUTA
        ORDER BY PK_ESTADO
        `,
      ),
    ]);

    const courses = new Map<number, { id: number; designation: unknown }>();
    const curricularYears = new Map<
      string,
      { id: number; designation: unknown; courseId: number }
    >();

    contexts.forEach((row) => {
      const courseId = Number(row.COURSE_ID);
      const curricularYearId = Number(row.CURRICULAR_YEAR_ID);

      courses.set(courseId, {
        id: courseId,
        designation: row.COURSE,
      });
      curricularYears.set(`${courseId}:${curricularYearId}`, {
        id: curricularYearId,
        designation: row.CURRICULAR_YEAR,
        courseId,
      });
    });

    return {
      data: {
        courses: [...courses.values()],
        curricularYears: [...curricularYears.values()],
        curricularUnits: contexts.map((row) => ({
          curricularGradeId: Number(row.CURRICULAR_GRADE_ID),
          curricularUnitId: Number(row.CURRICULAR_UNIT_ID),
          designation: row.CURRICULAR_UNIT,
          courseId: Number(row.COURSE_ID),
          curricularYearId: Number(row.CURRICULAR_YEAR_ID),
        })),
        terms: terms.map((row) => ({
          id: Number(row.TERM_ID),
          assessmentTypeId: Number(row.ASSESSMENT_TYPE_ID),
          assessmentType: row.ASSESSMENT_TYPE,
          startDate: row.START_DATE,
          endDate: row.END_DATE,
          isOpen: Number(row.IS_OPEN) === 1,
        })),
        statuses: statuses.map((row) => ({
          id: Number(row.ID),
          designation: row.DESIGNACAO,
        })),
      },
    };
  }

  /**
   * Lista somente as pautas ativas submetidas pelo docente autenticado no
   * contexto e filtros informados.
   */
  async findAll(filters: FindAgendaLaunchesDto, userId: number) {
    await this.validateAcademicContext(
      filters.academicYearId,
      filters.degreeId,
      filters.courseId,
    );
    const teacher = await this.findTeacherByUser(userId, this.dataSource);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const params: Record<string, number> = {
      academicYearId: filters.academicYearId,
      degreeId: filters.degreeId,
      semesterId: filters.semesterId,
      teacherId: Number(teacher.TEACHER_ID),
    };
    const conditions = [
      `JSON_VALUE(
        LP.REF_ANO_LECTIVO,
        '$.pk' RETURNING NUMBER NULL ON ERROR
      ) = :academicYearId`,
      `JSON_VALUE(
        LP.REF_DOCENTE,
        '$.pk' RETURNING NUMBER NULL ON ERROR
      ) = :teacherId`,
      'GC.CODIGO_SEMESTRE = :semesterId',
      'C.TIPO_CANDIDATURA = :degreeId',
      'C.TIPO_CANDIDATURA IN (2, 3)',
      'LP.ACTIVE_STATE = 1',
      'GC.STATUS_ = 1',
      'C.STATUS_ = 1',
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
     * - JOIN recompõe as referências JSON da pauta em entidades académicas;
     * - LEFT JOIN permite exibir a pauta mesmo sem designação de estado;
     * - WHERE restringe ano, docente, semestre, grau, estado ativo e filtros.
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
      WHERE ${conditions.join('\n        AND ')}
    `;

    /*
     * A contagem e a listagem reutilizam o mesmo bloco de JOIN/WHERE. A query
     * de dados acrescenta projeção, ordenação estável e paginação.
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
          DBMS_LOB.SUBSTR(D.DESIGNACAO, 4000, 1) AS CURRICULAR_UNIT,
          JSON_VALUE(LP.REF_DOCENTE, '$.desc') AS TEACHER
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
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Regista uma pauta pendente depois de validar docente, contexto, atribuição,
   * prazo e duplicidade dentro de uma única transação.
   */
  async create(body: CreateAgendaLaunchDto, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const teacher = await this.findTeacherByUser(userId, queryRunner);
      const context = await this.findAndLockAcademicContext(body, queryRunner);

      await this.validateTeacherAssignment(body, userId, queryRunner);
      await this.validateOpenTerm(body, queryRunner);
      await this.validateDuplicate(body, queryRunner);

      const refAcademicYear = JSON.stringify({
        pk: body.academicYearId,
        desc: context.ACADEMIC_YEAR,
        corLetra: 'black',
      });
      const refTeacher = JSON.stringify({
        pk: Number(teacher.TEACHER_ID),
        desc: teacher.TEACHER_NAME,
        corLetra: 'black',
      });
      const refCurricularGrade = JSON.stringify({
        pk: body.curricularGradeId,
        desc: context.CURRICULAR_UNIT,
        corLetra: 'black',
      });

      /*
       * INSERT grava as referências legadas em JSON, inicia a pauta no estado
       * pendente e devolve a chave gerada pelo Oracle por meio de bind de saída.
       */
      const result = (await queryRunner.query(
        `
        INSERT INTO FK2_MGD_TB_LANCAMENTO_PAUTA (
          REF_ANO_LECTIVO,
          REF_DOCENTE,
          REF_GRADE_CURRICULAR,
          FK_ESTADO_LANCAMENTO_PAUTA,
          CREATED_AT,
          UPDATED_AT,
          ACTIVE_STATE,
          FICHEIRO_NAME,
          FK_TIPO_AVALIACAO
        ) VALUES (
          :refAcademicYear,
          :refTeacher,
          :refCurricularGrade,
          :initialStatusId,
          SYSDATE,
          SYSDATE,
          1,
          :fileName,
          :assessmentTypeId
        )
        RETURNING PK_LANCAMENTO_PAUTA INTO :outId
        `,
        {
          refAcademicYear,
          refTeacher,
          refCurricularGrade,
          initialStatusId: PostGraduationAgendaLaunchService.INITIAL_STATUS_ID,
          fileName: body.fileName,
          assessmentTypeId: body.assessmentTypeId,
          outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        } as unknown as any[],
      )) as unknown as { outId?: number[] };

      const id = Number(result.outId?.[0]);
      if (!id) {
        throw new BadRequestException(
          'Nao foi possivel obter o codigo da pauta criada',
        );
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Pauta de Pos-Graduacao registada com sucesso',
        data: { id },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Valida a existência do ano, do grau e, quando informado, do curso ativo
   * pertencente ao mesmo grau de Pós-Graduação.
   */
  private async validateAcademicContext(
    academicYearId: number,
    degreeId: number,
    courseId?: number,
  ) {
    /*
     * As duas consultas de existência separam ano e grau para produzir erros
     * específicos sem carregar dados além do primeiro registo encontrado.
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

    if (courseId) {
      /*
       * SELECT opcional confirma que o curso está ativo, pertence ao grau
       * selecionado e continua dentro da fronteira 2/3.
       */
      const courses = await this.dataSource.query<DatabaseRow[]>(
        `
        SELECT CODIGO
        FROM FK2_TB_CURSOS
        WHERE CODIGO = :courseId
          AND TIPO_CANDIDATURA = :degreeId
          AND TIPO_CANDIDATURA IN (2, 3)
          AND STATUS_ = 1
        FETCH FIRST 1 ROWS ONLY
        `,
        { courseId, degreeId } as unknown as any[],
      );

      if (!courses.length) {
        throw new NotFoundException(
          'Curso nao encontrado no grau de Pos-Graduacao informado',
        );
      }
    }
  }

  /**
   * Resolve o docente ativo associado ao utilizador autenticado.
   */
  private async findTeacherByUser(
    userId: number,
    executor: Pick<DataSource, 'query'> | Pick<QueryRunner, 'query'>,
  ): Promise<TeacherRow> {
    /*
     * SELECT liga docente e utilizador pela referência JSON armazenada no
     * cadastro docente e exige que o utilizador permaneça ativo.
     */
    const rows = (await executor.query(
      `
      SELECT
        D.CODIGO AS TEACHER_ID,
        U.NOME AS TEACHER_NAME
      FROM FK2_MGD_TB_DOCENTE D
      INNER JOIN FK2_MCA_TB_UTILIZADOR U
        ON U.PK_UTILIZADOR = JSON_VALUE(
          D.CODIGO_UTILIZADOR,
          '$.pk' RETURNING NUMBER NULL ON ERROR
      )
      WHERE U.PK_UTILIZADOR = :userId
        AND U.ACTIVE_STATE = 1
      FETCH FIRST 1 ROWS ONLY
      `,
      { userId } as unknown as any[],
    )) as TeacherRow[];

    if (!rows.length) {
      throw new ForbiddenException(
        'Utilizador autenticado nao esta associado a um docente activo',
      );
    }

    return rows[0];
  }

  /**
   * Confirma e bloqueia a grade curricular que receberá a pauta.
   */
  private async findAndLockAcademicContext(
    body: CreateAgendaLaunchDto,
    queryRunner: QueryRunner,
  ): Promise<AcademicContextRow> {
    /*
     * SELECT recompõe grade, UC, curso e ano; WHERE exige correspondência
     * integral com o DTO; FOR UPDATE OF bloqueia a grade durante a submissão.
     */
    const rows = (await queryRunner.query(
      `
      SELECT
        GC.CODIGO AS CURRICULAR_GRADE_ID,
        DBMS_LOB.SUBSTR(D.DESIGNACAO, 4000, 1) AS CURRICULAR_UNIT,
        C.DESIGNACAO AS COURSE,
        AL.DESIGNACAO AS ACADEMIC_YEAR
      FROM FK2_TB_GRADE_CURRICULAR GC
      INNER JOIN FK2_TB_DISCIPLINAS D
        ON D.CODIGO = GC.CODIGO_DISCIPLINA
      INNER JOIN FK2_TB_CURSOS C
        ON C.CODIGO = GC.CODIGO_CURSO
      INNER JOIN FK2_TB_ANO_LECTIVO AL
        ON AL.CODIGO = :academicYearId
      WHERE GC.CODIGO = :curricularGradeId
        AND GC.CODIGO_CURSO = :courseId
        AND GC.CODIGO_CLASSE = :curricularYearId
        AND GC.CODIGO_SEMESTRE = :semesterId
        AND C.TIPO_CANDIDATURA = :degreeId
        AND C.TIPO_CANDIDATURA IN (2, 3)
        AND GC.STATUS_ = 1
        AND C.STATUS_ = 1
      FOR UPDATE OF GC.CODIGO
      `,
      {
        academicYearId: body.academicYearId,
        curricularGradeId: body.curricularGradeId,
        courseId: body.courseId,
        curricularYearId: body.curricularYearId,
        semesterId: body.semesterId,
        degreeId: body.degreeId,
      } as unknown as any[],
    )) as AcademicContextRow[];

    if (!rows.length) {
      throw new NotFoundException(
        'Contexto academico de Pos-Graduacao nao encontrado',
      );
    }

    return rows[0];
  }

  /**
   * Garante que o utilizador autenticado é o docente de uma aula ativa da UC.
   */
  private async validateTeacherAssignment(
    body: CreateAgendaLaunchDto,
    userId: number,
    queryRunner: QueryRunner,
  ) {
    /*
     * SELECT de existência procura horário ativo da grade e usa EXISTS para
     * comprovar uma aula ativa cuja referência aponta para o utilizador.
     */
    const rows = (await queryRunner.query(
      `
      SELECT 1
      FROM FK2_MGH_TB_HORARIO H
      WHERE TO_NUMBER(NULLIF(H.FK_GRADE_CURRICULAR, '')) =
          :curricularGradeId
        AND H.FK_ANO_LECTIVO = :academicYearId
        AND H.FK_SEMESTRE = :semesterId
        AND H.ACTIVE_STATE = 1
        AND NVL(H.FK_ESTADO_HORARIO_WF, 0) <> 4
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
        curricularGradeId: body.curricularGradeId,
        academicYearId: body.academicYearId,
        semesterId: body.semesterId,
        userId,
      } as unknown as any[],
    )) as DatabaseRow[];

    if (!rows.length) {
      throw new ForbiddenException(
        'O docente autenticado nao esta associado a unidade curricular seleccionada',
      );
    }
  }

  /**
   * Confirma que o prazo escolhido corresponde ao contexto e está aberto hoje.
   */
  private async validateOpenTerm(
    body: CreateAgendaLaunchDto,
    queryRunner: QueryRunner,
  ) {
    /*
     * SELECT cruza prazo e tipo de prazo; WHERE valida ano, semestre, grau,
     * avaliação, sigla LN, estado ativo e intervalo cronológico inclusivo.
     */
    const rows = (await queryRunner.query(
      `
      SELECT P.PK_PRAZO
      FROM FK2_MCAL_TB_PRAZO P
      INNER JOIN FK2_MCAL_TB_TIPO_PRAZO TP
        ON TP.PK_TIPO_PRAZO = P.FK_TIPO_PRAZO
      WHERE P.PK_PRAZO = :termId
        AND P.FK_ANO_LECTIVO = :academicYearId
        AND P.FK_SEMESTRE = :semesterId
        AND P.TIPO_CANDIDATURA = :degreeId
        AND P.FK_TIPO_AVALIACAO = :assessmentTypeId
        AND TP.SIGLA = 'LN'
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
        assessmentTypeId: body.assessmentTypeId,
      } as unknown as any[],
    )) as DatabaseRow[];

    if (!rows.length) {
      throw new BadRequestException(
        'O prazo para lancamento desta pauta nao esta aberto',
      );
    }
  }

  /**
   * Impede mais de uma pauta ativa para a mesma UC, ano e tipo de avaliação.
   */
  private async validateDuplicate(
    body: CreateAgendaLaunchDto,
    queryRunner: QueryRunner,
  ) {
    /*
     * SELECT interpreta as referências JSON da pauta e procura uma combinação
     * ativa já existente antes do INSERT.
     */
    const rows = (await queryRunner.query(
      `
      SELECT LP.PK_LANCAMENTO_PAUTA
      FROM FK2_MGD_TB_LANCAMENTO_PAUTA LP
      WHERE JSON_VALUE(
          LP.REF_ANO_LECTIVO,
          '$.pk' RETURNING NUMBER NULL ON ERROR
        ) = :academicYearId
        AND JSON_VALUE(
          LP.REF_GRADE_CURRICULAR,
          '$.pk' RETURNING NUMBER NULL ON ERROR
        ) = :curricularGradeId
        AND LP.FK_TIPO_AVALIACAO = :assessmentTypeId
        AND LP.ACTIVE_STATE = 1
      FETCH FIRST 1 ROWS ONLY
      `,
      {
        academicYearId: body.academicYearId,
        curricularGradeId: body.curricularGradeId,
        assessmentTypeId: body.assessmentTypeId,
      } as unknown as any[],
    )) as DatabaseRow[];

    if (rows.length) {
      throw new ConflictException(
        'Ja existe uma pauta activa para esta unidade curricular e tipo de avaliacao',
      );
    }
  }

  /**
   * Acrescenta condição e bind apenas quando o filtro opcional foi informado.
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
