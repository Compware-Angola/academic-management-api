import { BadRequestException, Injectable } from '@nestjs/common';

import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { ViewMonthsDto } from './dto/view-months.dto';
import { DataSource, QueryRunner } from 'typeorm';
import { GenerateMesTempDTO } from './dto/generate-mes-temp.dto';
import { MESTEMP, mesTempConfig, mesTempConfigDoutoramento, mesTempConfigMestrado } from '../util/generator-mes-temp';
import { formatDisplay } from '../util/formate-date';
import { CreateMesTempDTO, MesItemDTO } from './dto/create-mes-temp.dto';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { CreateAcademicCalendarDto, FetchAcademicCalendarDto } from './dto/create-academic_calendar.dto';
import { AcademicCalendarDto, ConfigureAcademicCalendarDto } from './dto/configure-academic-calendar.dto';
import { FetchVacanciesFromActiveAcademicYearDto, VagasItemDto } from './dto/vagas.dto';
type InsertVagasCursoType = { codigoUtilizador: number, codigoAnoLectivo: number, vagas: VagasItemDto[] }
type CreateAcademicYearUtilType = { periodo: AcademicCalendarDto, codigoUtilizador: number }
@Injectable()
export class AcademicCalendarService {
  constructor(private readonly dataSource: DataSource, private readonly anoLectivoUtil: AnoLectivoUtil) { }

  async findAcademicYearsWithConfiguredSemesters(params: FetchAcademicCalendarDto) {
    const where = params.tipo_candidatura ? 'AND CODIGO_TIPO_CANDIDATURA = :tipo_candidatura' : 'AND CODIGO_TIPO_CANDIDATURA=1';
    const result = await this.dataSource.query(`
      SELECT
        CODIGO AS codigo,
        DESIGNACAO AS designacao,
        ESTADO AS estado
      FROM FK2_TB_ANO_LECTIVO
      WHERE DATAINICIOPRIMEIROSEMESTRE IS NOT NULL
        AND DATAFIMPRIMEIROSEMESTRE IS NOT NULL
        AND DATAINICIOSEGUNDOSEMESTRE IS NOT NULL
        AND DATAFIMSEGUNDOSEMESTRE IS NOT NULL
        ${where}
      ORDER BY CODIGO DESC
    `, params.tipo_candidatura ? [params.tipo_candidatura] : []);

    return {
      anolectivos: toLowerCaseKeys(result),
    };
  }

  async findActiveApplicationTypes(posgraduacao?: boolean) {
    const baseQuery = `
      SELECT
        ID AS codigo,
        DESIGNACAO AS designacao
      FROM FK2_TB_TIPO_CANDIDATURA
      WHERE STATUS_ = 1
    `;

    const query = posgraduacao
      ? `${baseQuery} AND ID IN (2, 3) ORDER BY ID`
      : `${baseQuery} ORDER BY ID`;

    const result = await this.dataSource.query(query);

    return {
      tipo_candidaturas: toLowerCaseKeys(result),
    };
  }

  async findAcademicYearParams(anolectivo: number) {
    const result = await this.dataSource.query(
      `
        SELECT
          CODIGO,
          DESIGNACAO,
          TO_CHAR(DATAINICIOPRIMEIROSEMESTRE, 'YYYY-MM-DD') AS DATA_INICIO_PRIMEIRO_SEMESTRE,
          TO_CHAR(DATAFIMPRIMEIROSEMESTRE, 'YYYY-MM-DD') AS DATA_FIM_PRIMEIRO_SEMESTRE,
          TO_CHAR(DATAINICIOSEGUNDOSEMESTRE, 'YYYY-MM-DD') AS DATA_INICIO_SEGUNDO_SEMESTRE,
          TO_CHAR(DATAFIMSEGUNDOSEMESTRE, 'YYYY-MM-DD') AS DATA_FIM_SEGUNDO_SEMESTRE,
          ESTADO
        FROM FK2_TB_ANO_LECTIVO
        WHERE CODIGO = :1
        ORDER BY CODIGO
      `,
      [anolectivo],
    );

    return {
      ano_lectivo: result.map((row) => ({
        codigo: row.CODIGO,
        designacao: row.DESIGNACAO,
        dataInicioPrimeiroSemestre: row.DATA_INICIO_PRIMEIRO_SEMESTRE,
        dataFimPrimeiroSemestre: row.DATA_FIM_PRIMEIRO_SEMESTRE,
        dataInicioSegundoSemestre: row.DATA_INICIO_SEGUNDO_SEMESTRE,
        dataFimSegundoSemestre: row.DATA_FIM_SEGUNDO_SEMESTRE,
        estado: row.ESTADO,
      })),
    };
  }

  async createAcademicYear(body: CreateAcademicCalendarDto) {
    const {
      designacao,
      codigo_utilizador: codigoUtilizador,
      data_inicio_primeiro_semestre: dataInicioPrimeiroSemestre,
      data_fim_primeiro_semestre: dataFimPrimeiroSemestre,
      data_inicio_segundo_semestre: dataInicioSegundoSemestre,
      data_fim_segundo_semestre: dataFimSegundoSemestre,
      codigo_tipo_candidatura: codigoTipoCandidatura
    } = body;

    if (
      !designacao ||
      !codigoUtilizador ||
      !dataInicioPrimeiroSemestre ||
      !dataFimPrimeiroSemestre ||
      !dataInicioSegundoSemestre ||
      !dataFimSegundoSemestre ||
      !codigoTipoCandidatura
    ) {
      throw new BadRequestException('Os campos são obrigatórios');
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingPandingDraft = await queryRunner.query(
        `SELECT CODIGO
          FROM FK2_TB_ANO_LECTIVO
          WHERE ESTADO = 'Rascunho'
        `,
      );

      if (existingPandingDraft.length > 0) {
        throw new BadRequestException('Existe um ano lectivo pendente');
      }
      const existingAcademicYear = await queryRunner.query(
        ` SELECT COUNT(*) AS TOTAL
          FROM FK2_TB_ANO_LECTIVO
          WHERE DESIGNACAO = :1
          AND ESTADO != 'Rascunho'
        `,
        [designacao],
      );

      if (Number(existingAcademicYear[0]?.TOTAL || 0) > 0) {
        throw new BadRequestException('Ano lectivo já existe');
      }

      const nextCodeResult = await queryRunner.query(`
        SELECT NVL(MAX(CODIGO), 0) + 1 AS CODIGO
        FROM FK2_TB_ANO_LECTIVO
      `);

      const codigo = Number(nextCodeResult[0]?.CODIGO);

      await queryRunner.query(
        `INSERT INTO FK2_TB_ANO_LECTIVO (
  CODIGO,
  DESIGNACAO,
  DATAINICIOPRIMEIROSEMESTRE,
  DATAFIMPRIMEIROSEMESTRE,
  DATAINICIOSEGUNDOSEMESTRE,
  DATAFIMSEGUNDOSEMESTRE,
  ESTADO,
  DATA_ULTIMA_ATUALIZACAO,
  UTILIZADOR,
  STATUS_,
  EPOCA_EXAME_ACESSO,
  CODIGO_TIPO_CANDIDATURA
) VALUES (
  :1,
  :2,
  TO_DATE(:3, 'YYYY-MM-DD'),
  TO_DATE(:4, 'YYYY-MM-DD'),
  TO_DATE(:5, 'YYYY-MM-DD'),
  TO_DATE(:6, 'YYYY-MM-DD'),
  'Rascunho',
  SYSDATE,
  :7,
  0,
  1,
  :8
)`,
        [
          codigo,
          designacao,
          dataInicioPrimeiroSemestre,
          dataFimPrimeiroSemestre,
          dataInicioSegundoSemestre,
          dataFimSegundoSemestre,
          codigoUtilizador,
          codigoTipoCandidatura,
        ],
      );

      await queryRunner.commitTransaction();

      return {
        codigo,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findDraftAcademicYear() {
    const [result] = await this.dataSource.query(
      `SELECT
        CODIGO,
        DESIGNACAO,
        TO_CHAR(DATAINICIOPRIMEIROSEMESTRE, 'YYYY-MM-DD') AS DATA_INICIO_PRIMEIRO_SEMESTRE,
        TO_CHAR(DATAFIMPRIMEIROSEMESTRE, 'YYYY-MM-DD') AS DATA_FIM_PRIMEIRO_SEMESTRE,
        TO_CHAR(DATAINICIOSEGUNDOSEMESTRE, 'YYYY-MM-DD') AS DATA_INICIO_SEGUNDO_SEMESTRE,
        TO_CHAR(DATAFIMSEGUNDOSEMESTRE, 'YYYY-MM-DD') AS DATA_FIM_SEGUNDO_SEMESTRE,
        ESTADO
     FROM FK2_TB_ANO_LECTIVO
     WHERE ESTADO = 'Rascunho'
     FETCH FIRST 1 ROW ONLY`
    );
    if (!result) {
      return {
        ano_lectivo: null
      }
    }
    return {
      ano_lectivo: {
        codigo: result.CODIGO,
        designacao: result.DESIGNACAO,
        dataInicioPrimeiroSemestre: result.DATA_INICIO_PRIMEIRO_SEMESTRE,
        dataFimPrimeiroSemestre: result.DATA_FIM_PRIMEIRO_SEMESTRE,
        dataInicioSegundoSemestre: result.DATA_INICIO_SEGUNDO_SEMESTRE,
        dataFimSegundoSemestre: result.DATA_FIM_SEGUNDO_SEMESTRE,
        estado: result.ESTADO,
      },
    }
  }
  async updateAcademicYearState(
    anolectivo: number,
    estado: number,
  ) {

    if (![0, 1].includes(estado)) {
      throw new BadRequestException(
        'O estado deve ser 0 ou 1'
      );
    }


    const queryRunner =
      this.dataSource.createQueryRunner();


    await queryRunner.connect();
    await queryRunner.startTransaction();


    try {


      const academicYear =
        await queryRunner.query(
          `
                SELECT
                    CODIGO,
                    CODIGO_TIPO_CANDIDATURA
                FROM FK2_TB_ANO_LECTIVO
                WHERE CODIGO = :1
                FOR UPDATE
                `,
          [anolectivo],
        );


      if (!academicYear.length) {
        throw new BadRequestException(
          'Ano lectivo não encontrado'
        );
      }



      const {
        CODIGO_TIPO_CANDIDATURA
      } = academicYear[0];



      const estadoDescricao =
        estado === 1
          ? 'Activo'
          : 'Desactivo';



      /**
       * Ativando um ano:
       * primeiro desativa todos
       * os outros do mesmo tipo
       */
      if (estado === 1) {

        await queryRunner.query(
          `
                UPDATE FK2_TB_ANO_LECTIVO

                SET
                    ESTADO = 'Desactivo',
                    STATUS_ = 0

                WHERE
                    CODIGO_TIPO_CANDIDATURA = :1

                AND
                    CODIGO <> :2
                `,
          [
            CODIGO_TIPO_CANDIDATURA,
            anolectivo,
          ],
        );

      }



      /**
       * Atualiza o ano escolhido
       */
      await queryRunner.query(
        `
            UPDATE FK2_TB_ANO_LECTIVO

            SET
                ESTADO = :1,
                STATUS_ = :2

            WHERE CODIGO = :3
            `,
        [
          estadoDescricao,
          estado,
          anolectivo,
        ],
      );



      await queryRunner.commitTransaction();



      return {
        msgresposta:
          'Ano lectivo atualizado com sucesso',
      };


    } catch (error) {

      await queryRunner.rollbackTransaction();
      throw error;

    } finally {

      await queryRunner.release();

    }
  }

  async findVacanciesByAcademicYearAndApplicationType(
    anolectivo: number,
    tpcandidatura: number,
  ) {
    const mainTable = tpcandidatura === 1 ? 'FK2_VAGAS_CURSOS' : 'FK2_VAGAS_CURSOS_POS_GRADUACAO';
    const result = await this.dataSource.query(
      `
        SELECT
          VC.NUM_VAGAS AS NUMERO_VAGAS,
          VC.ID AS CODIGO,
          TC.DESIGNACAO AS CURSO_DESCRICAO,
          TC.CODIGO AS CODIGO_CURSO,
          TP.DESIGNACAO AS PERIODO_DESCRICAO
        FROM ${mainTable} VC
        INNER JOIN FK2_TB_CURSOS TC
          ON TC.CODIGO = VC.CURSO_ID
        INNER JOIN FK2_TB_PERIODOS TP
          ON TP.CODIGO = VC.PERIODO_ID
        WHERE VC.ANO_LECTIVO_ID = :1
          AND TC.TIPO_CANDIDATURA = :2
        ORDER BY TC.CODIGO, TP.CODIGO
      `,
      [anolectivo, tpcandidatura],
    );

    return {
      vagas: result.map((row) => ({
        codigo: row.CODIGO,
        numeroVagas: row.NUMERO_VAGAS,
        cursoDescricao: row.CURSO_DESCRICAO,
        codigoCurso: row.CODIGO_CURSO,
        periodoDescricao: row.PERIODO_DESCRICAO,
      })),
    };
  }

  async createAcademicYearVacancies(body: any) {
    const {
      codigo_ano_lectivo: codigoAnoLectivo,
      codigo_utilizador: codigoUtilizador,
      vagas,
    } = body;

    if (!codigoAnoLectivo || !codigoUtilizador) {
      throw new BadRequestException('Os campos são obrigatórios');
    }

    if (!Array.isArray(vagas) || vagas.length === 0) {
      throw new BadRequestException('A lista de vagas é obrigatória');
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let lastCode = 0;

      for (const vaga of vagas) {

        const {
          codigo_periodo: codigoPeriodo,
          codigo_curso: codigoCurso,
          polo_id,
          numero_vagas: numeroVagas,
        } = vaga;
        const codigoPolo = polo_id ?? 4;
        if (
          !codigoPeriodo ||
          !codigoCurso ||
          !codigoPolo ||
          numeroVagas === undefined ||
          numeroVagas === null
        ) {
          throw new BadRequestException('Os dados da vaga são obrigatórios');
        }

        const nextCodeResult = await queryRunner.query(`
          SELECT NVL(MAX(ID), 0) + 1 AS CODIGO
          FROM FK2_VAGAS_CURSOS
        `);

        lastCode = Number(nextCodeResult[0]?.CODIGO);

        await queryRunner.query(
          `
            INSERT INTO FK2_VAGAS_CURSOS (
              ID,
              CURSO_ID,
              NUM_VAGAS,
              POLO_ID,
              USER_ID,
              PERIODO_ID,
              CREATED_AT,
              UPDATED_AT,
              ANO_LECTIVO_ID,
              CANAL
            ) VALUES (
              :1,
              :2,
              :3,
              :4,
              :5,
              :6,
              SYSDATE,
              SYSDATE,
              :7,
              2
            )
          `,
          [
            lastCode,
            codigoCurso,
            numeroVagas,
            codigoPolo,
            codigoUtilizador,
            codigoPeriodo,
            codigoAnoLectivo,
          ],
        );
      }

      await queryRunner.commitTransaction();

      return {
        codigo: lastCode,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateVacancyNumber(id: number, numVagas: number) {
    if (numVagas < 0) {
      throw new BadRequestException('O número de vagas não pode ser negativo');
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const vacancy = await queryRunner.query(
        `
          SELECT ID
          FROM FK2_VAGAS_CURSOS
          WHERE ID = :1
        `,
        [id],
      );

      if (!vacancy.length) {
        throw new BadRequestException('Vaga não encontrada');
      }

      await queryRunner.query(
        `
          UPDATE FK2_VAGAS_CURSOS
          SET NUM_VAGAS = :1
          WHERE ID = :2
        `,
        [numVagas, id],
      );

      await queryRunner.commitTransaction();

      return {
        status: '200',
        updated: 1,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findVacanciesFromActiveAcademicYear({
    tipo_candidatura = 1,
  }: FetchVacanciesFromActiveAcademicYearDto) {
    const activeAcademicYear = await this.dataSource.query(
      `
      SELECT CODIGO
      FROM FK2_TB_ANO_LECTIVO
      WHERE STATUS_ = 1
        AND CODIGO_TIPO_CANDIDATURA = :1
      ORDER BY CODIGO DESC
      FETCH FIRST 1 ROW ONLY
    `,
      [tipo_candidatura],
    );

    if (!activeAcademicYear.length) {
      throw new BadRequestException('Ano lectivo ativo não encontrado');
    }

    const academicYearId = activeAcademicYear[0].CODIGO;

    const mainTable =
      tipo_candidatura === 1
        ? 'FK2_VAGAS_CURSOS'
        : 'FK2_VAGAS_CURSOS_POS_GRADUACAO';

    const [vacancies, availableCourses] = await Promise.all([
      this.dataSource.query(
        `
        SELECT
          VC.NUM_VAGAS AS NUMERO_VAGAS,
          VC.POLO_ID AS CODIGO_POLO,
          VC.PERIODO_ID AS CODIGO_PERIODO,
          TC.DESIGNACAO AS CURSO_DESCRICAO,
          TC.CODIGO AS CODIGO_CURSO,
          TP.DESIGNACAO AS PERIODO_DESCRICAO
        FROM ${mainTable} VC
        INNER JOIN FK2_TB_CURSOS TC
          ON TC.CODIGO = VC.CURSO_ID
        INNER JOIN FK2_TB_PERIODOS TP
          ON TP.CODIGO = VC.PERIODO_ID
        WHERE VC.ANO_LECTIVO_ID = :1
          AND TC.TIPO_CANDIDATURA = :2
        ORDER BY TC.CODIGO, TP.CODIGO
      `,
        [academicYearId, tipo_candidatura],
      ),

      this.dataSource.query(
        `
        SELECT
          TC.CODIGO,
          TC.DESIGNACAO
        FROM FK2_TB_CURSOS TC
        WHERE TC.TIPO_CANDIDATURA = :1
          AND TC.TIPO_CURSO = 1
          AND TC.STATUS_ = 1
          AND NOT EXISTS (
            SELECT 1
            FROM ${mainTable} VC
            WHERE VC.CURSO_ID = TC.CODIGO
              AND VC.ANO_LECTIVO_ID = :2
          )
        ORDER BY TC.DESIGNACAO
      `,
        [tipo_candidatura, academicYearId],
      ),
    ]);

    return {
      vagas: vacancies.map((row) => ({
        numeroVagas: row.NUMERO_VAGAS,
        cursoDescricao: row.CURSO_DESCRICAO,
        codigoCurso: row.CODIGO_CURSO,
        periodoDescricao: row.PERIODO_DESCRICAO,
        codigo_periodo: row.CODIGO_PERIODO,
        codigo_polo: row.CODIGO_POLO,
      })),

      cursosDisponiveis: availableCourses.map((row) => ({
        codigo: row.CODIGO,
        designacao: row.DESIGNACAO,
      })),
    };
  }

  async findMonthlyFeesByAcademicYear(anolectivo: number) {
    const result = await this.dataSource.query(
      `
        SELECT
          MT.DESIGNACAO AS DESIGNACAO,
          MT.PRESTACAO AS PRESTACAO,
          TO_CHAR(MT.DATA_LIMITE, 'YYYY-MM-DD"T"HH24:MI:SS') AS DATA_LIMITE,
          TS.DESIGNACAO AS SEMESTRE
        FROM FK2_MES_TEMP MT
        INNER JOIN FK2_MCAL_TB_SEMESTRE TS
          ON TS.PK_SEMESTRE = MT.SEMESTRE
        WHERE MT.ANO_LECTIVO = :1
        ORDER BY MT.DATA_LIMITE, MT.DESIGNACAO
      `,
      [anolectivo],
    );

    return {
      meses: result.map((row) => ({
        designacao: row.DESIGNACAO,
        prestacao: row.PRESTACAO,
        dataLimite: row.DATA_LIMITE,
        semestre: row.SEMESTRE,
      })),
    };
  }

  async viewMonths(params: ViewMonthsDto) {
    let query = `
    SELECT
      DESIGNACAO,
      ISENCAO,
      ORDEM_MES,
      ANO_LECTIVO,
      PRESTACAO,
      ACTIVO,
      ACTIVO_POSGRADUACAO,
      DATA_LIMITE,
      DATA_INICIAL,
      DATA_FINAL,
      DATA_FINAL_DESCONTO,
      SEMESTRE,
      SEMESTRE_POSGRADUACAO,
      ID
    FROM
      FK2_MES_TEMP
    WHERE
      ACTIVO = 1
      AND ANO_LECTIVO = :anoLectivo
  `;

    const parameters: any = {
      anoLectivo: params.anoLectivo,
    };

    // Filtro opcional de semestre
    if (params.semestre !== undefined && params.semestre !== null) {
      query += ` AND SEMESTRE = :semestre`;
      parameters.semestre = params.semestre;
    }

    query += `
    ORDER BY
      PRESTACAO ASC
  `;

    const result = await this.dataSource.query(
      query,
      Object.values(parameters),
    );

    return toLowerCaseKeys(result);
  }
  private async insertMesTemp(queryRunner: QueryRunner, mes: MesItemDTO) {
    await queryRunner.query(
      `
    INSERT INTO FK2_MES_TEMP (
        DESIGNACAO,
        ISENCAO,
        ORDEM_MES,
        ANO_LECTIVO,
        PRESTACAO,
        ACTIVO,
        ACTIVO_POSGRADUACAO,
        DATA_LIMITE,
        DATA_INICIAL,
        DATA_FINAL,
        DATA_FINAL_DESCONTO,
        SEMESTRE,
        SEMESTRE_POSGRADUACAO
    ) VALUES (
        :designacao,
        :isencao,
        :ordem_mes,
        :ano_lectivo,
        :prestacao,
        :activo,
        :activo_posgraduacao,
        TO_DATE(:data_limite, 'YYYY-MM-DD'),
        TO_DATE(:data_inicial, 'YYYY-MM-DD'),
        TO_DATE(:data_final, 'YYYY-MM-DD'),
        CASE WHEN :data_final_desconto IS NULL THEN NULL
        ELSE TO_DATE(:data_final_desconto, 'YYYY-MM-DD') END,
        :semestre,
        :semestre_posgraduacao
    )
    `,
      {
        designacao: mes.designacao,
        isencao: mes.isencao,
        ordem_mes: mes.ordem_mes,
        ano_lectivo: mes.ano_lectivo,
        prestacao: mes.prestacao,
        activo: mes.activo,
        activo_posgraduacao: mes.activo_posgraduacao,
        data_limite: mes.data_limite,
        data_inicial: mes.data_inicial,
        data_final: mes.data_final,
        data_final_desconto: mes.data_final_desconto ?? null,
        semestre: mes.semestre,
        semestre_posgraduacao: mes.semestre_posgraduacao,
      } as any,
    );
  }

  async createMesTemp(param: CreateMesTempDTO) {
    const queryRunner = this.dataSource.createQueryRunner();
    ``
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const mes of param.meses) {
        await this.insertMesTemp(queryRunner, mes);
      }

      await queryRunner.commitTransaction();

      return {
        message: 'MesTemp cadastrado com sucesso',
        totalInseridos: param.meses.length,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Erro ao inserir MesTemp:', error);
      throw new Error('Erro ao inserir meses dentro da transação.');
    } finally {
      await queryRunner.release();
    }
  }
  async obterAnoLectivo(anoLectivoId: number) {
    const sqlAnoLectivo = `
      SELECT
        DATAINICIOPRIMEIROSEMESTRE,
        DATAINICIOSEGUNDOSEMESTRE
      FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :anoLectivoId
    `;
    const result = await this.dataSource.query(sqlAnoLectivo, {
      anoLectivoId,
    } as any);

    const row = result?.[0];
    if (!row) {
      throw new BadRequestException('O ano lectivo não encontrado');
    }
    return toLowerCaseKeys(row);
  }

  async generateMesTemp({ anoFinal, anoInicial, tipo_candidatura = 1 }: GenerateMesTempDTO) {
    switch (tipo_candidatura) {
      case 1:
        return this.generateMesTempLinceciatura({ anoFinal, anoInicial });
      case 2:
        return this.generateMesMestrado({ anoFinal, anoInicial });
      case 3:
        return this.generateMesDotoramento({ anoFinal, anoInicial });
      default:
        throw new BadRequestException('Tipo de candidatura inválido');
    }
  }

  async configuracaoGeral() {
    const semestreAtual = await this.anoLectivoUtil.getSemestreAtual();
    const semestresConfigurados = await this.anoLectivoUtil.getSemestresConfigurados();

    return {
      anoLectivo: {
        id: semestreAtual.anoId,
        designacao: semestresConfigurados.anoLetivo?.designacao,

      },
      semestreAtual: {
        semestre: semestreAtual.semestre,
        descricao: semestreAtual.descricao,
        dataFim: semestreAtual.dataFim,
      },
      semestresConfigurados: {
        primeiroSemestre: semestresConfigurados.primeiroSemestre,
        segundoSemestre: semestresConfigurados.segundoSemestre,
      },
    };
  }

  async configureAcademicCalendar(body: ConfigureAcademicCalendarDto, codigoUtilizador: number) {
    const { periodo, meses } = body;

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      await this.createAcademicYearUtil(queryRunner, { periodo, codigoUtilizador })
      const codigoAnoLectivo = await queryRunner.query(
        `SELECT CODIGO
          FROM FK2_TB_ANO_LECTIVO
          WHERE DESIGNACAO = :1
          AND ESTADO = 'Rascunho' 
        `,
        [periodo.designacao],
      );

      for (const mes of meses) {
        await this.insertMesTemp(queryRunner, {
          ...mes,
          ano_lectivo: codigoAnoLectivo[0].CODIGO,
        })
      }
      await queryRunner.query(
        `UPDATE FK2_TB_ANO_LECTIVO
          SET ESTADO = 'Desactivo'
          WHERE CODIGO = :1
        `,
        [codigoAnoLectivo[0].CODIGO],
      );
      await queryRunner.commitTransaction();
      return { message: "Ano lectivo configurado com sucesso" };
    }

    catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
  private async createAcademicYearUtil(queryRunner: QueryRunner, { periodo, codigoUtilizador }: CreateAcademicYearUtilType) {
    const existingPandingDraft = await queryRunner.query(
      `SELECT CODIGO
          FROM FK2_TB_ANO_LECTIVO
          WHERE ESTADO = 'Rascunho' AND CODIGO_TIPO_CANDIDATURA =:1 
        `,
      [periodo.codigo_tipo_candidatura]
    );

    if (existingPandingDraft.length > 0) {
      throw new BadRequestException('Existe um ano lectivo pendente');
    }
    const existingAcademicYear = await queryRunner.query(
      ` SELECT COUNT(*) AS TOTAL
          FROM FK2_TB_ANO_LECTIVO
          WHERE DESIGNACAO = :1 AND CODIGO_TIPO_CANDIDATURA =:2
          AND ESTADO != 'Rascunho'
        `,
      [periodo.designacao, periodo.codigo_tipo_candidatura],
    );

    if (Number(existingAcademicYear[0]?.TOTAL || 0) > 0) {
      throw new BadRequestException('Ano lectivo já existe');
    }
    await queryRunner.query(
      `
       INSERT INTO FK2_TB_ANO_LECTIVO (
           
            DESIGNACAO,
            DATAINICIOPRIMEIROSEMESTRE,
            DATAFIMPRIMEIROSEMESTRE,
            DATAINICIOSEGUNDOSEMESTRE,
            DATAFIMSEGUNDOSEMESTRE,
            ESTADO,
            DATA_ULTIMA_ATUALIZACAO,
            UTILIZADOR,
            STATUS_,
            EPOCA_EXAME_ACESSO,
            CODIGO_TIPO_CANDIDATURA
          ) VALUES (
            
            :1,
            TO_DATE(:2, 'YYYY-MM-DD'),
            TO_DATE(:3, 'YYYY-MM-DD'),
            TO_DATE(:4, 'YYYY-MM-DD'),
            TO_DATE(:5, 'YYYY-MM-DD'),
            'Rascunho',
            SYSDATE,
            :6,
            0,
            1,
            :7
          )
       `,
      [

        periodo.designacao,
        periodo.data_inicio_primeiro_semestre,
        periodo.data_fim_primeiro_semestre,
        periodo.data_inicio_segundo_semestre,
        periodo.data_fim_segundo_semestre,
        codigoUtilizador,
        periodo.codigo_tipo_candidatura,
      ],
    );


  }
  private async insertVagasCurso(queryRunner: QueryRunner, { codigoUtilizador, codigoAnoLectivo, vagas }: InsertVagasCursoType) {
    let vagasCursosLastCode = 0;
    for (const vaga of vagas) {
      const codigoPolo = vaga.polo_id ?? 4;
      const nextCodeResult = await queryRunner.query(`
          SELECT NVL(MAX(ID), 0) + 1 AS CODIGO
          FROM FK2_VAGAS_CURSOS
        `);

      vagasCursosLastCode = Number(nextCodeResult[0]?.CODIGO);
      await queryRunner.query(`
            INSERT INTO FK2_VAGAS_CURSOS (
              ID,
              CURSO_ID,
              NUM_VAGAS,
              POLO_ID,
              USER_ID,
              PERIODO_ID,
              CREATED_AT,
              UPDATED_AT,
              ANO_LECTIVO_ID,
              CANAL
            ) VALUES (
              :1,
              :2,
              :3,
              :4,
              :5,
              :6,
              SYSDATE,
              SYSDATE,
              :7,
              2
            )
          `,
        [
          vagasCursosLastCode,
          vaga.codigo_curso,
          vaga.numero_vagas,
          codigoPolo,
          codigoUtilizador,
          vaga.codigo_periodo,
          codigoAnoLectivo,
        ]
      )
    }
  }

  private generateMesTempLinceciatura({ anoFinal, anoInicial }: { anoFinal: number, anoInicial: number }) {
    const result: MESTEMP[] = [];
    mesTempConfig.forEach((mesTemp) => {
      const isPastYear = mesTemp.ordem_mes >= 10 && mesTemp.ordem_mes <= 12;
      const anoCorrente = isPastYear ? anoInicial : anoFinal;

      const dataLimite = mesTemp.data_limite ? new Date(mesTemp.data_limite) : null;
      dataLimite?.setFullYear(anoCorrente);

      const dataFinal = mesTemp.data_final ? new Date(mesTemp.data_final) : null;
      dataFinal?.setFullYear(anoCorrente);

      const dataInicial = mesTemp.data_inicial ? new Date(mesTemp.data_inicial) : null;
      dataInicial?.setFullYear(anoCorrente);

      result.push({
        designacao: mesTemp.designacao + anoCorrente,
        isencao: mesTemp.isencao,
        ordem_mes: mesTemp.ordem_mes,
        ano_lectivo: mesTemp.ano_lectivo,
        prestacao: mesTemp.prestacao,
        activo: mesTemp.activo,
        activo_posgraduacao: mesTemp.activo_posgraduacao,
        data_limite: dataLimite ? formatDisplay(dataLimite) : null,
        data_inicial: dataInicial ? formatDisplay(dataInicial) : null,
        data_final: dataFinal ? formatDisplay(dataFinal) : null,
        data_final_desconto: mesTemp.data_final_desconto,
        semestre: mesTemp.semestre,
        semestre_posgraduacao: mesTemp.semestre_posgraduacao,
      });
    });
    return result;
  }


  private generateMesMestrado({ anoFinal, anoInicial }: { anoFinal: number, anoInicial: number }) {
    const result: MESTEMP[] = [];


    mesTempConfigMestrado.forEach((mesTemp) => {
      const isPastYear = mesTemp.ordem_mes >= 10 && mesTemp.ordem_mes <= 12;
      const anoCorrente = isPastYear ? anoInicial : anoFinal;

      const dataLimite = mesTemp.data_limite ? new Date(mesTemp.data_limite) : null;
      dataLimite?.setFullYear(anoCorrente);

      const dataFinal = mesTemp.data_final ? new Date(mesTemp.data_final) : null;
      dataFinal?.setFullYear(anoCorrente);

      const dataInicial = mesTemp.data_inicial ? new Date(mesTemp.data_inicial) : null;
      dataInicial?.setFullYear(anoCorrente);

      result.push({
        designacao: mesTemp.designacao,
        isencao: mesTemp.isencao,
        ordem_mes: mesTemp.ordem_mes,
        ano_lectivo: mesTemp.ano_lectivo,
        prestacao: mesTemp.prestacao,
        activo: mesTemp.activo,
        activo_posgraduacao: mesTemp.activo_posgraduacao,
        data_limite: null,
        data_inicial: null,
        data_final: null,
        data_final_desconto: mesTemp.data_final_desconto,
        semestre: mesTemp.semestre,
        semestre_posgraduacao: mesTemp.semestre_posgraduacao,
      });
    });
    return result;
  }
  private generateMesDotoramento({ anoFinal, anoInicial }: { anoFinal: number, anoInicial: number }) {
    const result: MESTEMP[] = [];


    mesTempConfigDoutoramento.forEach((mesTemp) => {
      const isPastYear = mesTemp.ordem_mes >= 10 && mesTemp.ordem_mes <= 12;
      const anoCorrente = isPastYear ? anoInicial : anoFinal;

      const dataLimite = mesTemp.data_limite ? new Date(mesTemp.data_limite) : null;
      dataLimite?.setFullYear(anoCorrente);

      const dataFinal = mesTemp.data_final ? new Date(mesTemp.data_final) : null;
      dataFinal?.setFullYear(anoCorrente);

      const dataInicial = mesTemp.data_inicial ? new Date(mesTemp.data_inicial) : null;
      dataInicial?.setFullYear(anoCorrente);

      result.push({
        designacao: mesTemp.designacao,
        isencao: mesTemp.isencao,
        ordem_mes: mesTemp.ordem_mes,
        ano_lectivo: mesTemp.ano_lectivo,
        prestacao: mesTemp.prestacao,
        activo: mesTemp.activo,
        activo_posgraduacao: mesTemp.activo_posgraduacao,
        data_limite: null,
        data_inicial: null,
        data_final: null,
        data_final_desconto: mesTemp.data_final_desconto,
        semestre: mesTemp.semestre,
        semestre_posgraduacao: mesTemp.semestre_posgraduacao,
      });
    });
    return result;
  }
}
