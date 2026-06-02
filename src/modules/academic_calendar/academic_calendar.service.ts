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
