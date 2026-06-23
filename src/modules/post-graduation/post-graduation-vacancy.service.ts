import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as oracledb from 'oracledb';
import { DataSource, QueryRunner } from 'typeorm';
import { CreatePostGraduationVacancyDto } from './dto/create-vacancy.dto';
import { FindPostGraduationVacanciesDto } from './dto/find-vacancies.dto';
import { UpdatePostGraduationVacancyDto } from './dto/update-vacancy.dto';

type DatabaseRow = Record<string, unknown>;

/**
 * Gere vagas exclusivas de Mestrado e Doutoramento sem alterar o fluxo geral
 * de vagas do Exame de Acesso. O contexto da vaga é curso + período + ano.
 */
@Injectable()
export class PostGraduationVacancyService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Lista cursos ativos do grau informado e períodos ativos. O grau não é
   * inferido no frontend: a própria consulta restringe os cursos a 2 ou 3.
   */
  async findOptions(degreeId: number) {
    const [courses, periods] = await Promise.all([
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT
          C.CODIGO AS ID,
          C.DESIGNACAO AS DESIGNATION
        FROM FK2_TB_CURSOS C
        INNER JOIN FK2_TB_TIPO_CANDIDATURA TC
          ON TC.ID = C.TIPO_CANDIDATURA
        WHERE C.TIPO_CANDIDATURA = :degreeId
          AND C.TIPO_CANDIDATURA IN (2, 3)
          AND C.STATUS_ = 1
          AND TC.STATUS_ = 1
        ORDER BY C.DESIGNACAO
        `,
        { degreeId } as unknown as any[],
      ),
      this.dataSource.query<DatabaseRow[]>(`
        SELECT
          P.CODIGO AS ID,
          P.DESIGNACAO AS DESIGNATION
        FROM FK2_TB_PERIODOS P
        WHERE P.STATUS_ = 1
        ORDER BY P.CODIGO
      `),
    ]);

    return {
      courses: courses.map((row) => ({
        id: Number(row.ID),
        designation: row.DESIGNATION,
      })),
      periods: periods.map((row) => ({
        id: Number(row.ID),
        designation: row.DESIGNATION,
      })),
    };
  }

  /**
   * Lista vagas e calcula ocupação a partir de matrículas distintas com
   * confirmação ativa no ano da vaga. O polo não participa da consulta.
   */
  async findAll(filters: FindPostGraduationVacanciesDto) {
    const {
      academicYearId,
      degreeId,
      courseId,
      periodId,
      page = 1,
      limit = 20,
    } = filters;
    const offset = (page - 1) * limit;

    await this.validateAcademicContext(academicYearId, degreeId);

    const conditions = [
      'V.ANO_LECTIVO_ID = :academicYearId',
      'C.TIPO_CANDIDATURA = :degreeId',
      'C.TIPO_CANDIDATURA IN (2, 3)',
      'C.STATUS_ = 1',
    ];
    const params: Record<string, number> = {
      academicYearId,
      degreeId,
    };

    if (courseId) {
      conditions.push('V.CURSO_ID = :courseId');
      params.courseId = courseId;
    }

    if (periodId) {
      conditions.push('V.PERIODO_ID = :periodId');
      params.periodId = periodId;
    }

    const whereClause = conditions.join(' AND ');

    /*
     * A subconsulta correlacionada conta cada matrícula uma única vez quando:
     * - a confirmação está ativa;
     * - o ano da confirmação coincide com o ano da vaga;
     * - o curso atual da matrícula coincide com o curso da vaga;
     * - o turno atual coincide com o período da vaga.
     */
    const occupiedVacanciesSql = `
      SELECT COUNT(DISTINCT CONF.CODIGO_MATRICULA)
      FROM FK2_TB_CONFIRMACOES CONF
      INNER JOIN FK2_TB_MATRICULAS M
        ON M.CODIGO = CONF.CODIGO_MATRICULA
      INNER JOIN FK2_TB_ADMISSAO ADM
        ON ADM.CODIGO = M.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO PRE
        ON PRE.CODIGO = ADM.PRE_INCRICAO
      WHERE CONF.ESTADO = 1
        AND CONF.CODIGO_ANO_LECTIVO = V.ANO_LECTIVO_ID
        AND M.CODIGO_CURSO = V.CURSO_ID
        AND PRE.CODIGO_TURNO = V.PERIODO_ID
    `;

    const dataSql = `
      SELECT
        VACANCY_DATA.ID,
        VACANCY_DATA.COURSE_ID,
        VACANCY_DATA.COURSE,
        VACANCY_DATA.PERIOD_ID,
        VACANCY_DATA.PERIOD,
        VACANCY_DATA.ACADEMIC_YEAR_ID,
        VACANCY_DATA.ACADEMIC_YEAR,
        VACANCY_DATA.TOTAL_VACANCIES,
        VACANCY_DATA.OCCUPIED_VACANCIES,
        VACANCY_DATA.TOTAL_VACANCIES
          - VACANCY_DATA.OCCUPIED_VACANCIES AS VACANCY_BALANCE,
        GREATEST(
          VACANCY_DATA.TOTAL_VACANCIES
            - VACANCY_DATA.OCCUPIED_VACANCIES,
          0
        ) AS AVAILABLE_VACANCIES,
        GREATEST(
          VACANCY_DATA.OCCUPIED_VACANCIES
            - VACANCY_DATA.TOTAL_VACANCIES,
          0
        ) AS EXCESS_CONFIRMATIONS,
        VACANCY_DATA.CREATED_AT,
        VACANCY_DATA.UPDATED_AT
      FROM (
        SELECT
          V.ID,
          V.CURSO_ID AS COURSE_ID,
          C.DESIGNACAO AS COURSE,
          V.PERIODO_ID AS PERIOD_ID,
          P.DESIGNACAO AS PERIOD,
          V.ANO_LECTIVO_ID AS ACADEMIC_YEAR_ID,
          AL.DESIGNACAO AS ACADEMIC_YEAR,
          V.NUM_VAGAS AS TOTAL_VACANCIES,
          (${occupiedVacanciesSql}) AS OCCUPIED_VACANCIES,
          V.CREATED_AT,
          V.UPDATED_AT
        FROM FK2_VAGAS_CURSOS V
        INNER JOIN FK2_TB_CURSOS C
          ON C.CODIGO = V.CURSO_ID
        INNER JOIN FK2_TB_PERIODOS P
          ON P.CODIGO = V.PERIODO_ID
        INNER JOIN FK2_TB_ANO_LECTIVO AL
          ON AL.CODIGO = V.ANO_LECTIVO_ID
        WHERE ${whereClause}
      ) VACANCY_DATA
      ORDER BY
        VACANCY_DATA.COURSE,
        VACANCY_DATA.PERIOD,
        VACANCY_DATA.ID
      OFFSET :rowOffset ROWS FETCH NEXT :rowLimit ROWS ONLY
    `;

    const countSql = `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_VAGAS_CURSOS V
      INNER JOIN FK2_TB_CURSOS C
        ON C.CODIGO = V.CURSO_ID
      INNER JOIN FK2_TB_PERIODOS P
        ON P.CODIGO = V.PERIODO_ID
      INNER JOIN FK2_TB_ANO_LECTIVO AL
        ON AL.CODIGO = V.ANO_LECTIVO_ID
      WHERE ${whereClause}
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
        id: Number(row.ID),
        courseId: Number(row.COURSE_ID),
        course: row.COURSE,
        periodId: Number(row.PERIOD_ID),
        period: row.PERIOD,
        academicYearId: Number(row.ACADEMIC_YEAR_ID),
        academicYear: row.ACADEMIC_YEAR,
        totalVacancies: Number(row.TOTAL_VACANCIES),
        occupiedVacancies: Number(row.OCCUPIED_VACANCIES),
        vacancyBalance: Number(row.VACANCY_BALANCE),
        availableVacancies: Number(row.AVAILABLE_VACANCIES),
        excessConfirmations: Number(row.EXCESS_CONFIRMATIONS),
        createdAt: row.CREATED_AT,
        updatedAt: row.UPDATED_AT,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Cria uma vaga após validar ano, grau, curso e período. O lock de tabela
   * protege a verificação de duplicidade num esquema sem constraint conhecida
   * para curso + período + ano.
   */
  async create(dto: CreatePostGraduationVacancyDto, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.validateVacancyReferences(
        dto.academicYearId,
        dto.degreeId,
        dto.courseId,
        dto.periodId,
        queryRunner,
      );

      await queryRunner.query(
        'LOCK TABLE FK2_VAGAS_CURSOS IN SHARE ROW EXCLUSIVE MODE',
      );

      const duplicate = (await queryRunner.query(
        `
        SELECT ID
        FROM FK2_VAGAS_CURSOS
        WHERE CURSO_ID = :courseId
          AND PERIODO_ID = :periodId
          AND ANO_LECTIVO_ID = :academicYearId
        FETCH FIRST 1 ROWS ONLY
        `,
        {
          academicYearId: dto.academicYearId,
          courseId: dto.courseId,
          periodId: dto.periodId,
        } as unknown as any[],
      )) as DatabaseRow[];

      if (duplicate.length) {
        throw new ConflictException(
          'Já existe uma vaga para este curso, período e ano lectivo',
        );
      }

      const result = (await queryRunner.query(
        `
        INSERT INTO FK2_VAGAS_CURSOS (
          CURSO_ID,
          NUM_VAGAS,
          USER_ID,
          PERIODO_ID,
          CREATED_AT,
          UPDATED_AT,
          ANO_LECTIVO_ID,
          CANAL
        ) VALUES (
          :courseId,
          :numberOfVacancies,
          :userId,
          :periodId,
          SYSDATE,
          SYSDATE,
          :academicYearId,
          2
        )
        RETURNING ID INTO :outId
        `,
        {
          academicYearId: dto.academicYearId,
          courseId: dto.courseId,
          periodId: dto.periodId,
          numberOfVacancies: dto.numberOfVacancies,
          userId,
          outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        } as unknown as any[],
      )) as unknown as { outId?: number[] };

      const id = Number(result.outId?.[0]);
      if (!id) {
        throw new ConflictException(
          'Não foi possível obter o código da vaga criada',
        );
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Vaga de Pós-Graduação criada com sucesso',
        data: { id },
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
   * Atualiza somente a quantidade. Curso, período e ano permanecem imutáveis
   * para não transformar uma vaga já consumida noutro contexto académico.
   */
  async update(
    vacancyId: number,
    dto: UpdatePostGraduationVacancyDto,
    userId: number,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const vacancies = (await queryRunner.query(
        `
        SELECT
          V.ID,
          V.CURSO_ID AS COURSE_ID,
          V.PERIODO_ID AS PERIOD_ID,
          V.ANO_LECTIVO_ID AS ACADEMIC_YEAR_ID,
          C.TIPO_CANDIDATURA AS DEGREE_ID
        FROM FK2_VAGAS_CURSOS V
        INNER JOIN FK2_TB_CURSOS C
          ON C.CODIGO = V.CURSO_ID
        WHERE V.ID = :vacancyId
          AND C.TIPO_CANDIDATURA IN (2, 3)
        FOR UPDATE OF V.NUM_VAGAS
        `,
        { vacancyId } as unknown as any[],
      )) as DatabaseRow[];

      if (!vacancies.length) {
        throw new NotFoundException('Vaga de Pós-Graduação não encontrada');
      }

      const vacancy = vacancies[0];
      const occupiedVacancies = await this.countOccupiedVacancies(
        Number(vacancy.ACADEMIC_YEAR_ID),
        Number(vacancy.COURSE_ID),
        Number(vacancy.PERIOD_ID),
        queryRunner,
      );

      if (dto.numberOfVacancies < occupiedVacancies) {
        throw new ConflictException(
          `O número de vagas não pode ser inferior às ${occupiedVacancies} vagas já ocupadas`,
        );
      }

      await queryRunner.query(
        `
        UPDATE FK2_VAGAS_CURSOS
        SET
          NUM_VAGAS = :numberOfVacancies,
          USER_ID = :userId,
          UPDATED_AT = SYSDATE
        WHERE ID = :vacancyId
        `,
        {
          vacancyId,
          numberOfVacancies: dto.numberOfVacancies,
          userId,
        } as unknown as any[],
      );

      await queryRunner.commitTransaction();

      return {
        message: 'Número de vagas atualizado com sucesso',
        data: {
          id: vacancyId,
          totalVacancies: dto.numberOfVacancies,
          occupiedVacancies,
          availableVacancies: dto.numberOfVacancies - occupiedVacancies,
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
   * Confirma que ano e grau existem. Uma listagem válida sem vagas deve
   * retornar coleção vazia, mas um contexto inexistente deve retornar 404.
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
      throw new NotFoundException('Grau de Pós-Graduação não encontrado');
    }
  }

  /**
   * Valida as referências da criação dentro da mesma transação. O curso deve
   * pertencer exatamente ao grau recebido e o período deve estar ativo.
   */
  private async validateVacancyReferences(
    academicYearId: number,
    degreeId: number,
    courseId: number,
    periodId: number,
    queryRunner: QueryRunner,
  ): Promise<void> {
    const academicYears = (await queryRunner.query(
      `
      SELECT CODIGO
      FROM FK2_TB_ANO_LECTIVO
      WHERE CODIGO = :academicYearId
      FETCH FIRST 1 ROWS ONLY
      `,
      { academicYearId } as unknown as any[],
    )) as DatabaseRow[];

    if (!academicYears.length) {
      throw new NotFoundException('Ano lectivo não encontrado');
    }

    const courses = (await queryRunner.query(
      `
      SELECT C.CODIGO
      FROM FK2_TB_CURSOS C
      INNER JOIN FK2_TB_TIPO_CANDIDATURA TC
        ON TC.ID = C.TIPO_CANDIDATURA
      WHERE C.CODIGO = :courseId
        AND C.TIPO_CANDIDATURA = :degreeId
        AND C.TIPO_CANDIDATURA IN (2, 3)
        AND C.STATUS_ = 1
        AND TC.STATUS_ = 1
      FETCH FIRST 1 ROWS ONLY
      `,
      { courseId, degreeId } as unknown as any[],
    )) as DatabaseRow[];

    if (!courses.length) {
      throw new NotFoundException(
        'Curso ativo não encontrado para o grau de Pós-Graduação informado',
      );
    }

    const periods = (await queryRunner.query(
      `
      SELECT CODIGO
      FROM FK2_TB_PERIODOS
      WHERE CODIGO = :periodId
        AND STATUS_ = 1
      FETCH FIRST 1 ROWS ONLY
      `,
      { periodId } as unknown as any[],
    )) as DatabaseRow[];

    if (!periods.length) {
      throw new NotFoundException('Período ativo não encontrado');
    }
  }

  /**
   * Conta matrículas distintas confirmadas no ano, curso e período da vaga.
   * Estado atual da matrícula e polo não participam desta regra.
   */
  private async countOccupiedVacancies(
    academicYearId: number,
    courseId: number,
    periodId: number,
    queryRunner: QueryRunner,
  ): Promise<number> {
    const rows = (await queryRunner.query(
      `
      SELECT COUNT(DISTINCT CONF.CODIGO_MATRICULA) AS TOTAL
      FROM FK2_TB_CONFIRMACOES CONF
      INNER JOIN FK2_TB_MATRICULAS M
        ON M.CODIGO = CONF.CODIGO_MATRICULA
      INNER JOIN FK2_TB_ADMISSAO ADM
        ON ADM.CODIGO = M.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO PRE
        ON PRE.CODIGO = ADM.PRE_INCRICAO
      WHERE CONF.ESTADO = 1
        AND CONF.CODIGO_ANO_LECTIVO = :academicYearId
        AND M.CODIGO_CURSO = :courseId
        AND PRE.CODIGO_TURNO = :periodId
      `,
      {
        academicYearId,
        courseId,
        periodId,
      } as unknown as any[],
    )) as DatabaseRow[];

    return Number(rows[0]?.TOTAL ?? 0);
  }
}
