import { BadRequestException, Injectable } from '@nestjs/common';

import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { ViewMonthsDto } from './dto/view-months.dto';
import { DataSource, QueryRunner } from 'typeorm';
import { GenerateMesTempDTO } from './dto/generate-mes-temp.dto';
import { MESTEMP, mesTempConfig } from '../util/generator-mes-temp';
import { formatDisplay } from '../util/formate-date';
import { CreateMesTempDTO, MesItemDTO } from './dto/create-mes-temp.dto';
import { AnoLectivoUtil } from '../util/current-academic-year';

@Injectable()
export class AcademicCalendarService {
  constructor(private readonly dataSource: DataSource, private readonly anoLectivoUtil: AnoLectivoUtil) { }

  async findAcademicYearsWithConfiguredSemesters() {
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
      ORDER BY CODIGO DESC
    `);

    return {
      anolectivos: toLowerCaseKeys(result),
    };
  }

  async findActiveApplicationTypes() {
    const result = await this.dataSource.query(`
      SELECT
        ID AS codigo,
        DESIGNACAO AS designacao
      FROM FK2_TB_TIPO_CANDIDATURA
      WHERE STATUS_ = 1
      ORDER BY ID
    `);

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

  async createAcademicYear(body: any) {
    const {
      designacao,
      codigo_utilizador: codigoUtilizador,
      data_inicio_primeiro_semestre: dataInicioPrimeiroSemestre,
      data_fim_primeiro_semestre: dataFimPrimeiroSemestre,
      data_inicio_segundo_semestre: dataInicioSegundoSemestre,
      data_fim_segundo_semestre: dataFimSegundoSemestre,
    } = body;

    if (
      !designacao ||
      !codigoUtilizador ||
      !dataInicioPrimeiroSemestre ||
      !dataFimPrimeiroSemestre ||
      !dataInicioSegundoSemestre ||
      !dataFimSegundoSemestre
    ) {
      throw new BadRequestException('Os campos são obrigatórios');
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingAcademicYear = await queryRunner.query(
        `
          SELECT COUNT(*) AS TOTAL
          FROM FK2_TB_ANO_LECTIVO
          WHERE DESIGNACAO = :1
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
        `
          INSERT INTO FK2_TB_ANO_LECTIVO (
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
            EPOCA_EXAME_ACESSO
          ) VALUES (
            :1,
            :2,
            TO_DATE(:3, 'YYYY-MM-DD'),
            TO_DATE(:4, 'YYYY-MM-DD'),
            TO_DATE(:5, 'YYYY-MM-DD'),
            TO_DATE(:6, 'YYYY-MM-DD'),
            'Desactivo',
            SYSDATE,
            :7,
            0,
            1
          )
        `,
        [
          codigo,
          designacao,
          dataInicioPrimeiroSemestre,
          dataFimPrimeiroSemestre,
          dataInicioSegundoSemestre,
          dataFimSegundoSemestre,
          codigoUtilizador,
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

  async updateAcademicYearState(anolectivo: number, estado: number) {
    if (![0, 1].includes(estado)) {
      throw new BadRequestException('O estado deve ser 0 ou 1');
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const academicYear = await queryRunner.query(
        `
          SELECT CODIGO
          FROM FK2_TB_ANO_LECTIVO
          WHERE CODIGO = :1
        `,
        [anolectivo],
      );

      if (!academicYear.length) {
        throw new BadRequestException('Ano lectivo não encontrado');
      }

      const estadoDescricao = estado === 1 ? 'Activo' : 'Desactivo';

      await queryRunner.query(
        `
          UPDATE FK2_TB_ANO_LECTIVO
          SET ESTADO = :1
          WHERE CODIGO = :2
        `,
        [estadoDescricao, anolectivo],
      );

      await queryRunner.commitTransaction();

      return {
        msgresposta: 'Ano lectivo atualizado com sucesso',
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
    const result = await this.dataSource.query(
      `
        SELECT
          VC.NUM_VAGAS AS NUMERO_VAGAS,
          VC.ID AS CODIGO,
          TC.DESIGNACAO AS CURSO_DESCRICAO,
          TC.CODIGO AS CODIGO_CURSO,
          TP.DESIGNACAO AS PERIODO_DESCRICAO
        FROM FK2_VAGAS_CURSOS VC
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
          polo_id: codigoPolo,
          numero_vagas: numeroVagas,
        } = vaga;

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

  async findVacanciesFromActiveAcademicYear() {
    const activeAcademicYear = await this.dataSource.query(`
      SELECT CODIGO
      FROM FK2_TB_ANO_LECTIVO
      WHERE STATUS_ = 1
      ORDER BY CODIGO DESC
      FETCH FIRST 1 ROW ONLY
    `);

    if (!activeAcademicYear.length) {
      throw new BadRequestException('Ano lectivo ativo não encontrado');
    }

    const academicYearId = activeAcademicYear[0].CODIGO;

    const result = await this.dataSource.query(
      `
        SELECT
          VC.NUM_VAGAS AS NUMERO_VAGAS,
          VC.POLO_ID AS CODIGO_POLO,
          VC.PERIODO_ID AS CODIGO_PERIODO,
          TC.DESIGNACAO AS CURSO_DESCRICAO,
          TC.CODIGO AS CODIGO_CURSO,
          TP.DESIGNACAO AS PERIODO_DESCRICAO
        FROM FK2_VAGAS_CURSOS VC
        INNER JOIN FK2_TB_CURSOS TC
          ON TC.CODIGO = VC.CURSO_ID
        INNER JOIN FK2_TB_PERIODOS TP
          ON TP.CODIGO = VC.PERIODO_ID
        WHERE VC.ANO_LECTIVO_ID = :1
        ORDER BY TC.CODIGO, TP.CODIGO
      `,
      [academicYearId],
    );

    return {
      vagas: result.map((row) => ({
        numeroVagas: row.NUMERO_VAGAS,
        cursoDescricao: row.CURSO_DESCRICAO,
        codigoCurso: row.CODIGO_CURSO,
        periodoDescricao: row.PERIODO_DESCRICAO,
        codigo_periodo: row.CODIGO_PERIODO,
        codigo_polo: row.CODIGO_POLO,
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

  async generateMesTemp({ anoFinal, anoInicial }: GenerateMesTempDTO) {
    const result: MESTEMP[] = [];

    mesTempConfig.forEach((mesTemp) => {
      const isPastYear = mesTemp.ordem_mes >= 10 && mesTemp.ordem_mes <= 12;
      const anoCorrente = isPastYear ? anoInicial : anoFinal;

      const dataLimite = new Date(mesTemp.data_limite);
      dataLimite.setFullYear(anoCorrente);

      const dataFinal = new Date(mesTemp.data_final);
      dataFinal.setFullYear(anoCorrente);

      const dataInicial = new Date(mesTemp.data_inicial);
      dataInicial.setFullYear(anoCorrente);

      result.push({
        designacao: mesTemp.designacao + anoCorrente,
        isencao: mesTemp.isencao,
        ordem_mes: mesTemp.ordem_mes,
        ano_lectivo: mesTemp.ano_lectivo,
        prestacao: mesTemp.prestacao,
        activo: mesTemp.activo,
        activo_posgraduacao: mesTemp.activo_posgraduacao,
        data_limite: formatDisplay(dataLimite),
        data_inicial: formatDisplay(dataInicial),
        data_final: formatDisplay(dataFinal),
        data_final_desconto: mesTemp.data_final_desconto,
        semestre: mesTemp.semestre,
        semestre_posgraduacao: mesTemp.semestre_posgraduacao,
      });
    });
    return result;
  }


  async configuracaoGeral() {
    const semestreAtual = await this.anoLectivoUtil.getSemestreAtual();
    const semestresConfigurados = await this.anoLectivoUtil.getSemestresConfigurados();

    return {
      anoLectivo: {
        id: semestreAtual.anoId,
        designacao: semestresConfigurados.anoLectivoDesignacao,
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

}
