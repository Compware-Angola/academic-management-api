import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindMarcacaoPrazoDTO } from './dto/find-marcacao-prova-prazo.dto';
import { CreateAcademicActivitiesTermsDto } from './dto/create-academic-activities-terms.dto';
import { DecodedUserPayload } from '../common/types/token-validation-response.interface';
import { FindPrazosMatricula } from './dto/find-prazos-matricula.dto';
import { definirSemestre } from './util/definir-semestre';

@Injectable()
export class AcademicActivitiesService {
  constructor(private readonly dataSource: DataSource) {}

  async deleteAcademicActivities(codigo: number) {
    const codigoNum = Number(codigo);
    if (isNaN(codigoNum)) {
      throw new BadRequestException(
        'Código do Dia isentos deve ser um número válido',
      );
    }
    await this.findOne(codigoNum);

    const result = await this.dataSource.query(
      `DELETE FROM FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS WHERE CODIGO = :codigoNum`,
      [codigoNum],
    );

    if (result.affected === 0) {
      throw new Error('Actividade Lectiva não encontrado');
    }
    return {
      success: true,
      message: 'Actividade Lectiva  excluído com sucesso',
    };
  }

  async findOne(codigo: number) {
    const codigoNum = Number(codigo);
    if (isNaN(codigoNum)) {
      throw new BadRequestException(
        'Código do Actividade Lectiva deve ser um número válido',
      );
    }
    const activities = await this.dataSource.query(
      `SELECT * FROM FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS WHERE CODIGO = :codigoNum`,
      [codigoNum],
    );

    if (activities.length === 0) {
      throw new NotFoundException(
        `Actividade Lectiva com código ${codigo} não encontrada`,
      );
    }

    return await toLowerCaseKeys(activities[0]);
  }

  async prazosMatricula({ anoLectivo }: FindPrazosMatricula) {
    const sqlAnoLectivo = `
      SELECT
        DESIGNACAO,
        DATAINICIOPRIMEIROSEMESTRE,
        DATAFIMPRIMEIROSEMESTRE,
        DATAINICIOSEGUNDOSEMESTRE,
        DATAINICIOSEGUNDOSEMESTRE,
        DATAFIMSEGUNDOSEMESTRE,
        CODIGO
      FROM FK2_TB_ANO_LECTIVO WHERE CODIGO  = :anoLectivo
    `;

    const resultAnoLectivo = await this.dataSource.query(sqlAnoLectivo, {
      anoLectivo,
    } as any);
    const rowAnoLectivo = resultAnoLectivo[0];
    if (!rowAnoLectivo) {
      throw new BadRequestException('AnoLectivo não encontrado: ');
    }
    const sqlCalendarioAcademico = `
      SELECT
        DATA_INICIO,
        DATA_TERMINO,
        CODIGO_TIPO_CALENDARIO,
        DESCRICAO
      FROM FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS
      WHERE CODIGO_ANO_LECTIVO = :anoLectivo
      AND CODIGO_TIPO_CALENDARIO in (16,4)
      AND ATIVE_STATE = 1
    `;
    const resultCalendarioAcademico = await this.dataSource.query(
      sqlCalendarioAcademico,
      {
        anoLectivo,
      } as any,
    );
    const semestre = definirSemestre({
      DATAINICIOPRIMEIROSEMESTRE: rowAnoLectivo?.DATAINICIOPRIMEIROSEMESTRE,
      DATAFIMPRIMEIROSEMESTRE: rowAnoLectivo?.DATAFIMPRIMEIROSEMESTRE,
      DATAFIMSEGUNDOSEMESTRE: rowAnoLectivo?.DATAFIMSEGUNDOSEMESTRE,
      DATAINICIOSEGUNDOSEMESTRE: rowAnoLectivo?.DATAINICIOSEGUNDOSEMESTRE,
    });
    return {
      semestre,
      calendario: toLowerCaseKeys(resultCalendarioAcademico),
    };
  }

  async findMarcacaoProvaPrazo({ anoLectivo, semestre }: FindMarcacaoPrazoDTO) {
    const sqlMarcacaoPrazo = `
      select
          pz.PK_PRAZO   as prazoId,
          av.DESIGNACAO as designacao
      from FK2_MCAL_TB_PRAZO pz
      inner join FK2_MCAL_TB_TIPO_AVALIACAO av on av.PK_TIPO_AVALIACAO = pz.FK_TIPO_AVALIACAO
      where 1=1
      and pz.FK_TIPO_PRAZO= 4
      and pz.FK_ANO_LECTIVO = :anoLectivo
      and pz.FK_SEMESTRE = :semestre
    `;
    const params = {
      anoLectivo,
      semestre,
    };
    const [result] = await Promise.all([
      this.dataSource.query(sqlMarcacaoPrazo, params as any),
    ]);
    return {
      data: await toLowerCaseKeys(result),
    };
  }
  async createAcademicActivitiesTerms(
    body: CreateAcademicActivitiesTermsDto,
    user: DecodedUserPayload,
  ) {
    const {
      fk_tipo_avaliacao,
      fk_semestre,
      data_inicio,
      data_fim,
      observacao,
      fk_created_by,
      fk_ano_lectivo,
      tipo_candidatura,
      fk_tipo_prazo,
    } = body;

    /* =========================
     * Validações obrigatórias
     * ========================= */
    if (!data_inicio) {
      throw new BadRequestException('Campo "data_inicio" é obrigatório');
    }

    if (!fk_ano_lectivo) {
      throw new BadRequestException('Campo "fk_ano_lectivo" é obrigatório');
    }

    /* =========================
     * Gerar PK_PRAZO
     * ========================= */
    const [pkResult] = await this.dataSource.query(`
    SELECT MAX(pk_prazo) + 1 AS pk_prazo
    FROM FK2_MCAL_TB_PRAZO
    WHERE REGEXP_LIKE(pk_prazo, '^[0-9]+$')
  `);

    const pkPrazo = pkResult.PK_PRAZO ?? pkResult.pk_prazo;

    /* =========================
     * Criar ref_ano_lectivo (JSON)
     * ========================= */
    let refAnoLectivo: string | null = null;

    try {
      const [anoLectivo] = await this.dataSource.query(
        `
      SELECT DESIGNACAO
      FROM FK2_TB_ANO_LECTIVO
      WHERE CODIGO = :fkAnoLectivo
      `,
        { fkAnoLectivo: fk_ano_lectivo } as any,
      );

      if (anoLectivo) {
        refAnoLectivo = JSON.stringify({
          pk: fk_ano_lectivo,
          desc: anoLectivo.DESIGNACAO ?? anoLectivo.designacao,
        });
      }
    } catch (error) {
      refAnoLectivo = null;
    }

    /* =========================
     * Criar created_by (JSON)
     * ========================= */
    let createdBy: string;

    createdBy = JSON.stringify({
      pk: user.sub,
      desc: user.nome ?? user.username,
    });

    /* =========================
     * Insert
     * ========================= */
    try {
      await this.dataSource.query(
        `
      INSERT INTO FK2_MCAL_TB_PRAZO (
        pk_prazo,
        fk_tipo_avaliacao,
        fk_semestre,
        fk_tipo_prazo,
        ref_ano_lectivo,
        data_inicio,
        data_fim,
        observacao,
        created_by,
        created_at,
        updated_at,
        tipo_candidatura,
        fk_ano_lectivo,
        fk_created_by
      ) VALUES (
        :pkPrazo,
        :fkTipoAvaliacao,
        :fkSemestre,
        :fkTipoPrazo,
        :refAnoLectivo,
        TO_DATE(:dataInicio, 'YYYY-MM-DD"T"HH24:MI:SS'),
        TO_DATE(:dataFim, 'YYYY-MM-DD"T"HH24:MI:SS'),
        :observacao,
        :createdBy,
        SYSDATE,
        SYSDATE,
        :tipoCandidatura,
        :fkAnoLectivo,
        :fkCreatedBy
      )
      `,
        {
          pkPrazo,
          fkTipoAvaliacao: fk_tipo_avaliacao,
          fkSemestre: fk_semestre,
          fkTipoPrazo: fk_tipo_prazo,
          refAnoLectivo,
          dataInicio: data_inicio,
          dataFim: data_fim,
          observacao,
          createdBy,
          tipoCandidatura: tipo_candidatura,
          fkAnoLectivo: fk_ano_lectivo,
          fkCreatedBy: fk_created_by,
        } as any,
      );

      return {
        success: true,
        message: 'Prazo criado com sucesso',
        data: {
          pk_prazo: pkPrazo,
        },
      };
    } catch (error) {
      throw new BadRequestException('Erro ao inserir prazo: ' + error.message);
    }
  }
}
