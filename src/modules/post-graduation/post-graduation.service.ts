import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FindPrimaryRecordsDto } from './dto/find-primary-records.dto';
import { FindExamCalendarsDto } from './dto/find-exam-calendars.dto';
import { FindCurricularUnitFormulasDto } from './dto/find-curricular-unit-formulas.dto';
import { UpdateCurricularUnitFormulaDto } from './dto/update-curricular-unit-formula.dto';
import { FindOralCurricularUnitsDto } from './dto/find-oral-curricular-units.dto';
import { UpdateOralCurricularUnitStatusDto } from './dto/update-oral-curricular-unit-status.dto';

const COORDINATOR_ROLE_ID = 9;

/**
 * Centraliza consultas académicas gerais e configurações de avaliação que são
 * exclusivas de Mestrado e Doutoramento.
 */
@Injectable()
export class PostGraduationService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Lista os graus aceites pelo módulo e acrescenta a opção visual "Todos".
   */
  async findDegrees() {
    /*
     * SELECT limita a origem aos códigos institucionais 2 e 3, traduz as
     * designações esperadas e ignora tipos de candidatura inativos.
     */
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

  /**
   * Lista os registos primários dos estudantes confirmados no ano letivo,
   * preservando estudantes sem província, município ou nacionalidade.
   */
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
    /*
     * Bloco relacional compartilhado:
     * - INNER JOIN exige matrícula, admissão, candidatura, curso e faculdade;
     * - LEFT JOIN mantém o estudante quando dados geográficos ou período faltam;
     * - WHERE aplica Pós-Graduação, confirmação, grau opcional e pesquisa.
     */
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

    /*
     * Query de dados:
     * - SELECT monta o registo institucional e calcula idade/ano curricular;
     * - a subquery de confirmação obtém a classe válida no ano pesquisado;
     * - ORDER BY estabiliza a paginação por nome e matrícula.
     */
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

    /*
     * Query de total: reutiliza os mesmos JOINs e filtros da listagem para que
     * a paginação não conte estudantes diferentes dos apresentados.
     */
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

  /**
   * Lista os intervalos do calendário de provas de um ano e grau válidos.
   */
  async findExamCalendars({ academicYearId, degreeId }: FindExamCalendarsDto) {
    /*
     * As duas queries de existência validam separadamente o ano letivo e o grau
     * antes da consulta principal, permitindo mensagens de erro específicas.
     */
    const [academicYearRows, degreeRows] = await Promise.all([
      this.dataSource.query(
        `
        SELECT CODIGO
        FROM FK2_TB_ANO_LECTIVO
        WHERE CODIGO = :academicYearId
        FETCH FIRST 1 ROWS ONLY
        `,
        { academicYearId } as any,
      ),
      this.dataSource.query(
        `
        SELECT ID
        FROM FK2_TB_TIPO_CANDIDATURA
        WHERE ID = :degreeId
          AND STATUS_ = 1
        FETCH FIRST 1 ROWS ONLY
        `,
        { degreeId } as any,
      ),
    ]);

    if (!academicYearRows.length) {
      throw new NotFoundException('Ano lectivo nao encontrado');
    }

    if (!degreeRows.length) {
      throw new NotFoundException('Grau de Pos-Graduacao nao encontrado');
    }

    /*
     * Query principal:
     * - SELECT devolve datas, semestre, época e autoria;
     * - JOIN exige ano e grau, enquanto LEFT JOIN tolera referências opcionais;
     * - COALESCE suporta as duas colunas históricas de utilizador;
     * - WHERE mantém apenas calendários ativos do contexto solicitado.
     */
    const rows = await this.dataSource.query(
      `
      SELECT
        CAL.CODIGO AS ID,
        CAL.CODIGO_ANO_LECTIVO AS ACADEMIC_YEAR_ID,
        ANO.DESIGNACAO AS ACADEMIC_YEAR,
        CAL.TIPO_CANDIDATURA AS DEGREE_ID,
        GRAU.DESIGNACAO AS DEGREE,
        CAL.CODIGO_SEMESTRE AS SEMESTER_ID,
        SEM.DESIGNACAO AS SEMESTER,
        CAL.CODIGO_EPOCA AS ASSESSMENT_PERIOD_ID,
        EPOCA.DESCRICAO AS ASSESSMENT_PERIOD,
        TO_CHAR(CAL.DATA_INICIO, 'YYYY-MM-DD') AS START_DATE,
        TO_CHAR(CAL.DATA_TERMINO, 'YYYY-MM-DD') AS END_DATE,
        CAL.OBSERVACAO AS OBSERVATION,
        COALESCE(CAL.FK_UTILIZADOR, CAL.CODIGO_UTILIZADOR) AS CREATED_BY_ID,
        COALESCE(UTILIZADOR_FK.NOME, UTILIZADOR_CODIGO.NOME) AS CREATED_BY
      FROM FK2_TB_CALENDARIO CAL
      INNER JOIN FK2_TB_ANO_LECTIVO ANO
        ON ANO.CODIGO = CAL.CODIGO_ANO_LECTIVO
      INNER JOIN FK2_TB_TIPO_CANDIDATURA GRAU
        ON GRAU.ID = CAL.TIPO_CANDIDATURA
      LEFT JOIN FK2_TB_SEMESTRES SEM
        ON SEM.CODIGO = CAL.CODIGO_SEMESTRE
      LEFT JOIN FK2_TB_EPOCA_AVALICOES EPOCA
        ON EPOCA.CODIGO = CAL.CODIGO_EPOCA
      LEFT JOIN FK2_MCA_TB_UTILIZADOR UTILIZADOR_FK
        ON UTILIZADOR_FK.PK_UTILIZADOR = CAL.FK_UTILIZADOR
      LEFT JOIN FK2_MCA_TB_UTILIZADOR UTILIZADOR_CODIGO
        ON UTILIZADOR_CODIGO.PK_UTILIZADOR = CAL.CODIGO_UTILIZADOR
      WHERE CAL.ACTIVE_STATE = 1
        AND CAL.CODIGO_ANO_LECTIVO = :academicYearId
        AND CAL.TIPO_CANDIDATURA = :degreeId
      ORDER BY
        CAL.DATA_INICIO ASC,
        CAL.CODIGO_SEMESTRE ASC,
        CAL.CODIGO_EPOCA ASC,
        CAL.CODIGO ASC
      `,
      { academicYearId, degreeId } as any,
    );

    return {
      data: rows.map((row: Record<string, unknown>) => ({
        id: Number(row.ID),
        academicYearId: Number(row.ACADEMIC_YEAR_ID),
        academicYear: row.ACADEMIC_YEAR,
        degreeId: Number(row.DEGREE_ID),
        degree: row.DEGREE,
        semesterId: row.SEMESTER_ID === null ? null : Number(row.SEMESTER_ID),
        semester: row.SEMESTER,
        assessmentPeriodId:
          row.ASSESSMENT_PERIOD_ID === null
            ? null
            : Number(row.ASSESSMENT_PERIOD_ID),
        assessmentPeriod: row.ASSESSMENT_PERIOD,
        startDate: row.START_DATE,
        endDate: row.END_DATE,
        observation: row.OBSERVATION,
        createdById:
          row.CREATED_BY_ID === null ? null : Number(row.CREATED_BY_ID),
        createdBy: row.CREATED_BY,
      })),
    };
  }

  /**
   * Lista a fórmula de avaliação das UCs do plano curricular que o utilizador
   * está autorizado a coordenar.
   */
  async findCurricularUnitFormulas(
    filters: FindCurricularUnitFormulasDto,
    userId: number,
  ) {
    const { academicYearId, degreeId, courseId, curricularYearId, semesterId } =
      filters;

    await this.validatePostGraduationCourse(courseId, degreeId);
    await this.validateCourseCoordinator(userId, courseId);

    const curricularPlanId = await this.findCurricularPlanId(
      courseId,
      academicYearId,
    );

    /*
     * SELECT lê notas mínimas, pesos e auditoria; JOIN liga a configuração à
     * grade e à UC; WHERE restringe plano, curso, ano curricular, semestre e
     * grades ativas; ORDER BY produz uma lista previsível por UC.
     */
    const rows = await this.dataSource.query<Record<string, unknown>[]>(
      `
      SELECT
        PCG.CODIGO AS FORMULA_ID,
        GC.CODIGO AS CURRICULAR_GRADE_ID,
        D.CODIGO AS CURRICULAR_UNIT_ID,
        D.DESIGNACAO AS CURRICULAR_UNIT,
        PCG.NOTA_MIN_PRATICA AS MINIMUM_PRACTICAL_GRADE,
        PCG.PESO_PRATICA AS PRACTICAL_WEIGHT,
        PCG.NOTA_MIN_PRIMEIRA_FREQ AS MINIMUM_FIRST_FREQUENCY_GRADE,
        PCG.PESO_PRIMEIRA_FREQ AS FIRST_FREQUENCY_WEIGHT,
        PCG.NOTA_MIN_SEGUNDA_FREQ AS MINIMUM_SECOND_FREQUENCY_GRADE,
        PCG.PESO_SEGUNDA_FREQ AS SECOND_FREQUENCY_WEIGHT,
        PCG.UTILIZADOR AS UPDATED_BY_ID,
        U.NOME AS UPDATED_BY
      FROM FK2_TB_PLANO_CURRICULAR_GRADE PCG
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON GC.CODIGO = PCG.CODIGO_GRADE_CURRICULAR
      INNER JOIN FK2_TB_DISCIPLINAS D
        ON D.CODIGO = GC.CODIGO_DISCIPLINA
      LEFT JOIN FK2_MCA_TB_UTILIZADOR U
        ON U.PK_UTILIZADOR = PCG.UTILIZADOR
      WHERE PCG.CODIGO_PLANO_CURRICULAR_CURSO = :curricularPlanId
        AND GC.CODIGO_CURSO = :courseId
        AND GC.CODIGO_CLASSE = :curricularYearId
        AND GC.CODIGO_SEMESTRE = :semesterId
        AND GC.STATUS_ = 1
      ORDER BY D.DESIGNACAO
      `,
      {
        curricularPlanId,
        courseId,
        curricularYearId,
        semesterId,
      } as any,
    );

    return {
      data: rows.map((row: Record<string, unknown>) => ({
        formulaId: Number(row.FORMULA_ID),
        curricularGradeId: Number(row.CURRICULAR_GRADE_ID),
        curricularUnitId: Number(row.CURRICULAR_UNIT_ID),
        curricularUnit: row.CURRICULAR_UNIT,
        minimumPracticalGrade: this.toNullableNumber(
          row.MINIMUM_PRACTICAL_GRADE,
        ),
        practicalWeight: this.toNullableNumber(row.PRACTICAL_WEIGHT),
        minimumFirstFrequencyGrade: this.toNullableNumber(
          row.MINIMUM_FIRST_FREQUENCY_GRADE,
        ),
        firstFrequencyWeight: this.toNullableNumber(row.FIRST_FREQUENCY_WEIGHT),
        minimumSecondFrequencyGrade: this.toNullableNumber(
          row.MINIMUM_SECOND_FREQUENCY_GRADE,
        ),
        secondFrequencyWeight: this.toNullableNumber(
          row.SECOND_FREQUENCY_WEIGHT,
        ),
        updatedById: this.toNullableNumber(row.UPDATED_BY_ID),
        updatedBy: row.UPDATED_BY,
      })),
    };
  }

  /**
   * Atualiza uma fórmula dentro de transação, depois de validar os pesos, a
   * pertença à Pós-Graduação e a responsabilidade do coordenador.
   */
  async updateCurricularUnitFormula(
    formulaId: number,
    body: UpdateCurricularUnitFormulaDto,
    userId: number,
  ) {
    this.validateFormulaWeights(body);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      /*
       * SELECT localiza a fórmula e o respetivo curso; JOIN comprova a cadeia
       * fórmula -> grade -> curso; FOR UPDATE impede edições concorrentes.
       */
      const formulaRows = (await queryRunner.query(
        `
        SELECT
          PCG.CODIGO AS FORMULA_ID,
          GC.CODIGO_CURSO AS COURSE_ID,
          C.TIPO_CANDIDATURA AS DEGREE_ID
        FROM FK2_TB_PLANO_CURRICULAR_GRADE PCG
        INNER JOIN FK2_TB_GRADE_CURRICULAR GC
          ON GC.CODIGO = PCG.CODIGO_GRADE_CURRICULAR
        INNER JOIN FK2_TB_CURSOS C
          ON C.CODIGO = GC.CODIGO_CURSO
        WHERE PCG.CODIGO = :formulaId
          AND C.TIPO_CANDIDATURA IN (2, 3)
        FOR UPDATE
        `,
        { formulaId } as any,
      )) as Array<Record<string, unknown>>;

      if (!formulaRows.length) {
        throw new NotFoundException(
          'Formula de UC de Pos-Graduacao nao encontrada',
        );
      }

      const courseId = Number(formulaRows[0].COURSE_ID);
      await this.validateCourseCoordinator(userId, courseId, queryRunner);

      /*
       * UPDATE grava os seis parâmetros da fórmula e os identificadores de
       * auditoria. O WHERE altera somente a fórmula previamente bloqueada.
       */
      await queryRunner.query(
        `
        UPDATE FK2_TB_PLANO_CURRICULAR_GRADE
        SET
          NOTA_MIN_PRATICA = :minimumPracticalGrade,
          PESO_PRATICA = :practicalWeight,
          NOTA_MIN_PRIMEIRA_FREQ = :minimumFirstFrequencyGrade,
          PESO_PRIMEIRA_FREQ = :firstFrequencyWeight,
          NOTA_MIN_SEGUNDA_FREQ = :minimumSecondFrequencyGrade,
          PESO_SEGUNDA_FREQ = :secondFrequencyWeight,
          UTILIZADOR = :userId,
          CODIGO_UTILIZADOR = :userId
        WHERE CODIGO = :formulaId
        `,
        {
          formulaId,
          userId,
          ...body,
        } as any,
      );

      await queryRunner.commitTransaction();

      return {
        message: 'Formula da UC atualizada com sucesso',
        data: {
          formulaId,
          ...body,
          updatedById: userId,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Lista as UCs do plano e resolve, para cada uma, a configuração de avaliação
   * oral mais recente.
   */
  async findOralCurricularUnits(
    filters: FindOralCurricularUnitsDto,
    userId: number,
  ) {
    const { academicYearId, degreeId, courseId, curricularYearId, semesterId } =
      filters;

    await this.validatePostGraduationCourse(courseId, degreeId);
    await this.validateCourseCoordinator(userId, courseId);

    const curricularPlanId = await this.findCurricularPlanId(
      courseId,
      academicYearId,
    );

    /*
     * SELECT apresenta a UC e o estado de oral; a subquery com ROW_NUMBER
     * escolhe a configuração mais recente por grade; LEFT JOIN representa como
     * desativada uma UC ainda sem configuração; WHERE limita o plano e semestre.
     */
    const rows = await this.dataSource.query<Record<string, unknown>[]>(
      `
      SELECT
        GC.CODIGO AS CURRICULAR_GRADE_ID,
        D.CODIGO AS CURRICULAR_UNIT_ID,
        D.DESIGNACAO AS CURRICULAR_UNIT,
        NVL(ORAL.HABILITAR, 0) AS ORAL_ENABLED,
        ORAL.CODIGOUTILIZADOR AS UPDATED_BY_ID,
        U.NOME AS UPDATED_BY,
        TO_CHAR(ORAL.DATA, 'YYYY-MM-DD"T"HH24:MI:SS') AS UPDATED_AT
      FROM FK2_TB_PLANO_CURRICULAR_GRADE PCG
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON GC.CODIGO = PCG.CODIGO_GRADE_CURRICULAR
      INNER JOIN FK2_TB_DISCIPLINAS D
        ON D.CODIGO = GC.CODIGO_DISCIPLINA
      LEFT JOIN (
        SELECT
          CONFIG.CODIGOGRADECURRICULAR,
          CONFIG.HABILITAR,
          CONFIG.CODIGOUTILIZADOR,
          CONFIG.DATA,
          ROW_NUMBER() OVER (
            PARTITION BY CONFIG.CODIGOGRADECURRICULAR
            ORDER BY CONFIG.DATA DESC NULLS LAST, CONFIG.CODIGO DESC
          ) AS POSITION
        FROM FK2_TB_GRADE_CURRICULAR_DEFINIR_ORAL CONFIG
      ) ORAL
        ON ORAL.CODIGOGRADECURRICULAR = GC.CODIGO
       AND ORAL.POSITION = 1
      LEFT JOIN FK2_MCA_TB_UTILIZADOR U
        ON U.PK_UTILIZADOR = ORAL.CODIGOUTILIZADOR
      WHERE PCG.CODIGO_PLANO_CURRICULAR_CURSO = :curricularPlanId
        AND GC.CODIGO_CURSO = :courseId
        AND GC.CODIGO_CLASSE = :curricularYearId
        AND GC.CODIGO_SEMESTRE = :semesterId
        AND GC.STATUS_ = 1
      ORDER BY D.DESIGNACAO
      `,
      {
        curricularPlanId,
        courseId,
        curricularYearId,
        semesterId,
      } as any,
    );

    return {
      data: rows.map((row) => ({
        curricularGradeId: Number(row.CURRICULAR_GRADE_ID),
        curricularUnitId: Number(row.CURRICULAR_UNIT_ID),
        curricularUnit: row.CURRICULAR_UNIT,
        oralEnabled: Number(row.ORAL_ENABLED) === 1,
        updatedById: this.toNullableNumber(row.UPDATED_BY_ID),
        updatedBy: row.UPDATED_BY,
        updatedAt: row.UPDATED_AT,
      })),
    };
  }

  /**
   * Ativa ou desativa a avaliação oral de uma grade. Atualiza a configuração
   * mais recente quando existe; caso contrário, cria o primeiro registo.
   */
  async updateOralCurricularUnitStatus(
    curricularGradeId: number,
    body: UpdateOralCurricularUnitStatusDto,
    userId: number,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      /*
       * SELECT valida a grade e recupera o curso; JOIN confirma que o curso é
       * de Pós-Graduação; FOR UPDATE protege a configuração durante a decisão.
       */
      const gradeRows = (await queryRunner.query(
        `
        SELECT
          GC.CODIGO AS CURRICULAR_GRADE_ID,
          GC.CODIGO_CURSO AS COURSE_ID
        FROM FK2_TB_GRADE_CURRICULAR GC
        INNER JOIN FK2_TB_CURSOS C
          ON C.CODIGO = GC.CODIGO_CURSO
        WHERE GC.CODIGO = :curricularGradeId
          AND GC.STATUS_ = 1
          AND C.TIPO_CANDIDATURA IN (2, 3)
        FOR UPDATE
        `,
        { curricularGradeId } as any,
      )) as Array<Record<string, unknown>>;

      if (!gradeRows.length) {
        throw new NotFoundException(
          'Grade curricular de Pos-Graduacao nao encontrada',
        );
      }

      const courseId = Number(gradeRows[0].COURSE_ID);
      await this.validateCourseCoordinator(userId, courseId, queryRunner);

      /*
       * SELECT encontra e bloqueia a configuração mais recente da grade. A
       * subquery com MAX evita atualizar um registo histórico mais antigo.
       */
      const configurationRows = (await queryRunner.query(
        `
        SELECT CONFIG.CODIGO
        FROM FK2_TB_GRADE_CURRICULAR_DEFINIR_ORAL CONFIG
        WHERE CONFIG.CODIGO = (
          SELECT MAX(LATEST.CODIGO)
          FROM FK2_TB_GRADE_CURRICULAR_DEFINIR_ORAL LATEST
          WHERE LATEST.CODIGOGRADECURRICULAR = :curricularGradeId
        )
        FOR UPDATE
        `,
        { curricularGradeId } as any,
      )) as Array<Record<string, unknown>>;

      const oralEnabled = body.enabled ? 1 : 0;

      if (configurationRows.length) {
        /*
         * UPDATE altera estado, data e autoria da configuração existente. A
         * subquery JSON_OBJECT registra uma referência legível do utilizador.
         */
        await queryRunner.query(
          `
          UPDATE FK2_TB_GRADE_CURRICULAR_DEFINIR_ORAL
          SET
            HABILITAR = :oralEnabled,
            CODIGOUTILIZADOR = :userId,
            DATA = SYSDATE,
            REF_UTILIZADOR = (
              SELECT JSON_OBJECT(
                'pk' VALUE U.PK_UTILIZADOR,
                'desc' VALUE U.NOME
                RETURNING CLOB
              )
              FROM FK2_MCA_TB_UTILIZADOR U
              WHERE U.PK_UTILIZADOR = :userId
            )
          WHERE CODIGO = :configurationId
          `,
          {
            configurationId: Number(configurationRows[0].CODIGO),
            oralEnabled,
            userId,
          } as any,
        );
      } else {
        /*
         * INSERT cria a configuração inicial da grade e registra, no mesmo
         * momento, o utilizador responsável em colunas simples e JSON.
         */
        await queryRunner.query(
          `
          INSERT INTO FK2_TB_GRADE_CURRICULAR_DEFINIR_ORAL (
            CODIGOGRADECURRICULAR,
            CODIGOUTILIZADOR,
            HABILITAR,
            DATA,
            REF_UTILIZADOR
          )
          VALUES (
            :curricularGradeId,
            :userId,
            :oralEnabled,
            SYSDATE,
            (
              SELECT JSON_OBJECT(
                'pk' VALUE U.PK_UTILIZADOR,
                'desc' VALUE U.NOME
                RETURNING CLOB
              )
              FROM FK2_MCA_TB_UTILIZADOR U
              WHERE U.PK_UTILIZADOR = :userId
            )
          )
          `,
          {
            curricularGradeId,
            oralEnabled,
            userId,
          } as any,
        );
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Configuracao de oral atualizada com sucesso',
        data: {
          curricularGradeId,
          oralEnabled: body.enabled,
          updatedById: userId,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Garante que o curso pertence exatamente ao grau informado e ao universo
   * institucional de Mestrado ou Doutoramento.
   */
  private async validatePostGraduationCourse(
    courseId: number,
    degreeId: number,
  ) {
    /*
     * SELECT de existência: o WHERE cruza curso e grau e reforça a lista
     * permitida (2, 3); FETCH FIRST evita transportar dados desnecessários.
     */
    const rows = await this.dataSource.query<Record<string, unknown>[]>(
      `
      SELECT CODIGO
      FROM FK2_TB_CURSOS
      WHERE CODIGO = :courseId
        AND TIPO_CANDIDATURA = :degreeId
        AND TIPO_CANDIDATURA IN (2, 3)
      FETCH FIRST 1 ROWS ONLY
      `,
      { courseId, degreeId } as any,
    );

    if (!rows.length) {
      throw new NotFoundException(
        'Curso nao encontrado no grau de Pos-Graduacao informado',
      );
    }
  }

  /**
   * Confirma o vínculo ativo do utilizador como coordenador do curso.
   */
  private async validateCourseCoordinator(
    userId: number,
    courseId: number,
    queryExecutor: Pick<DataSource, 'query'> = this.dataSource,
  ) {
    /*
     * SELECT de autorização institucional: filtra utilizador, curso, cargo 9 e
     * estado ativo. Pode executar no DataSource ou na transação em curso.
     */
    const rows = (await queryExecutor.query(
      `
      SELECT C.PK_CARGO
      FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS C
      WHERE C.FK_UTILIZADOR = :userId
        AND C.FK_CURSO = :courseId
        AND C.FK_TIPO_CARGO = :coordinatorRoleId
        AND C.ACTIVE = 1
      FETCH FIRST 1 ROWS ONLY
      `,
      {
        userId,
        courseId,
        coordinatorRoleId: COORDINATOR_ROLE_ID,
      } as any,
    )) as Array<Record<string, unknown>>;

    if (!rows.length) {
      throw new ForbiddenException(
        'O utilizador autenticado nao e coordenador ativo deste curso',
      );
    }
  }

  /**
   * Obtém o plano curricular mais recente do curso no ano letivo informado.
   */
  private async findCurricularPlanId(courseId: number, academicYearId: number) {
    /*
     * A primeira query confirma o ano; a segunda procura o plano do curso,
     * priorizando o maior código quando existem versões no mesmo contexto.
     */
    const [academicYearRows, planRows] = await Promise.all([
      this.dataSource.query<Array<Record<string, unknown>>>(
        `
        SELECT CODIGO
        FROM FK2_TB_ANO_LECTIVO
        WHERE CODIGO = :academicYearId
        FETCH FIRST 1 ROWS ONLY
        `,
        { academicYearId } as any,
      ),
      this.dataSource.query<Array<Record<string, unknown>>>(
        `
        SELECT CODIGO
        FROM FK2_TB_PLANO_CURRICULAR_CURSO
        WHERE CODIGO_CURSO = :courseId
          AND CODIGO_ANO_LECTIVO = :academicYearId
        ORDER BY CODIGO DESC
        FETCH FIRST 1 ROWS ONLY
        `,
        { courseId, academicYearId } as any,
      ),
    ]);

    if (!academicYearRows.length) {
      throw new NotFoundException('Ano lectivo nao encontrado');
    }

    if (!planRows.length) {
      throw new NotFoundException(
        'Plano curricular nao encontrado para o curso e ano lectivo',
      );
    }

    return Number(planRows[0].CODIGO);
  }

  /**
   * Impede fórmulas incoerentes: os pesos das três componentes devem totalizar
   * 100%, com tolerância apenas para imprecisão decimal.
   */
  private validateFormulaWeights(body: UpdateCurricularUnitFormulaDto) {
    const totalWeight =
      body.practicalWeight +
      body.firstFrequencyWeight +
      body.secondFrequencyWeight;

    if (Math.abs(totalWeight - 100) > 0.001) {
      throw new BadRequestException(
        'A soma dos pesos da formula deve ser igual a 100%',
      );
    }
  }

  /**
   * Normaliza números vindos do Oracle sem transformar ausência em zero.
   */
  private toNullableNumber(value: unknown) {
    return value === null || value === undefined ? null : Number(value);
  }
}
