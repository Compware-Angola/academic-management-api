import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindMarcacaoPrazoDTO } from './dto/find-marcacao-prova-prazo.dto';
import { CreateAcademicActivitiesTermsDto } from './dto/create-academic-activities-terms.dto';
import { DecodedUserPayload } from '../../common/types/token-validation-response.interface';
import { FindPrazosMatricula } from './dto/find-prazos-matricula.dto';
import { definirSemestre } from './util/definir-semestre';
import { CreateCalendarActivityDto } from './dto/create-calendar-activity.dto';
import { FindCalendarActivitiesDto } from './dto/find-calendar-activities.dto';
import { FindAcademicActivityTermsDto } from './dto/find-academic-activity-terms.dto';
import { UpdateAcademicActivityTermDto } from './dto/update-academic-activity-term.dto';
import { EstadoAnoLectivoType } from 'src/common/enums/faso_anolectivo.type';

@Injectable()
export class AcademicActivitiesService {
  constructor(private readonly dataSource: DataSource) {}

  private getCodigoUtilizador(
    user: DecodedUserPayload,
    codigoUtilizadorBody?: number,
  ): number {
    return Number(
      user?.sub ??
        user?.userId ??
        user?.PK_UTILIZADOR ??
        user?.pk_utilizador ??
        user?.id ??
        codigoUtilizadorBody,
    );
  }

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
          av.DESIGNACAO as designacao,
          av.PK_TIPO_AVALIACAO as tipoAvaliacao
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

  async findCalendarActivities({
    anolectivo,
    tpcandidatura,
  }: FindCalendarActivitiesDto) {
    const actividades = await this.dataSource.query(
      `
      SELECT
        cal.CODIGO AS codigo,
        cal.DATA_INICIO AS data_inicio,
        cal.DATA_TERMINO AS data_termino,
        cal.DESCRICAO AS descricao,
        cal.CODIGO_ANO_LECTIVO AS cod_ano_lectivo,
        cal.CODIGO_TIPO_CALENDARIO AS codigo_tipo_calendario,
        cal.CODIGO_TIPO_CANDIDATURA AS codigo_tipo_candidatura,
        tipoCal.DESIGNACAO AS tipo_calendario,
        ano.DESIGNACAO AS ano_lectivo,
        cand.DESIGNACAO AS tipo_candidatura,
        JSON_VALUE(cal.REF_UTILIZADOR, '$.pk') AS codigo_utilizador,
        JSON_VALUE(cal.REF_UTILIZADOR, '$.desc') AS descricao_utilizador
      FROM FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS cal
      INNER JOIN FK2_TB_TIPO_CALENDARIO tipoCal
        ON tipoCal.CODIGO = cal.CODIGO_TIPO_CALENDARIO
      INNER JOIN FK2_TB_ANO_LECTIVO ano
        ON ano.CODIGO = cal.CODIGO_ANO_LECTIVO
      INNER JOIN FK2_TB_TIPO_CANDIDATURA cand
        ON cand.ID = cal.CODIGO_TIPO_CANDIDATURA
      WHERE cal.CODIGO_ANO_LECTIVO = :anolectivo
        AND cal.CODIGO_TIPO_CANDIDATURA = :tpcandidatura
        AND cal.ATIVE_STATE = 1
        AND tipoCal.CODIGO <> 7
      ORDER BY cal.DATA DESC
      `,
      { anolectivo, tpcandidatura } as any,
    );

    return {
      actividades: toLowerCaseKeys(actividades),
    };
  }

  async findAcademicActivityTerms({
    anolectivo,
    tpcandidatura,
    tpprazo,
  }: FindAcademicActivityTermsDto) {
    const prazos = await this.dataSource.query(
      `
      SELECT
    pz.PK_PRAZO AS prazo_id,
    pz.OBSERVACAO AS observacao,
    pz.FK_TIPO_AVALIACAO AS tipo_avaliacao_id,
    pz.DATA_INICIO AS data_inicio,
    pz.DATA_FIM AS data_fim,
    tv.DESIGNACAO AS tipo_avaliacao,
    ut.NOME AS criado_por_nome,
    ua.NOME AS atualizado_por_nome,
    pz.UPDATED_BY AS atualizado_por_id,
    pz.FK_SEMESTRE AS fk_semestre
  FROM FK2_MCAL_TB_PRAZO pz
  LEFT JOIN FK2_MCAL_TB_TIPO_AVALIACAO tv
    ON pz.FK_TIPO_AVALIACAO = tv.PK_TIPO_AVALIACAO
  LEFT JOIN FK2_MCA_TB_UTILIZADOR ut
    ON ut.PK_UTILIZADOR = pz.FK_CREATED_BY
  LEFT JOIN FK2_MCA_TB_UTILIZADOR ua
    ON ua.PK_UTILIZADOR = pz.UPDATED_BY
  WHERE pz.FK_ANO_LECTIVO = :anolectivo
    AND pz.FK_TIPO_PRAZO = :tpprazo
    AND pz.TIPO_CANDIDATURA = :tpcandidatura
    AND NVL(pz.ACTIVE_STATE, 1) = 1
  ORDER BY pz.CREATED_AT DESC
      `,
      { anolectivo, tpprazo, tpcandidatura } as any,
    );

    return {
      prazos: toLowerCaseKeys(prazos),
    };
  }

  async updateAcademicActivityTerm(
    pkPrazo: number,
    body: UpdateAcademicActivityTermDto,
    updatedBy: number, // id do utilizador autenticado, vindo do controller
  ) {
    if (typeof updatedBy !== 'number') {
      throw new BadRequestException('Utilizador autenticado inválido');
    }

    const {
      observacao,
      fk_semestre,
      data_inicio,
      data_fim,
      fk_tipo_avaliacao,
      fk_tipo_prazo,
      tipo_candidatura,
    } = body;

    const dataInicio = new Date(data_inicio);
    const dataFim = new Date(data_fim);

    if (Number.isNaN(dataInicio.getTime()) || Number.isNaN(dataFim.getTime())) {
      throw new BadRequestException('Data de início ou data de fim inválida');
    }

    if (dataInicio > dataFim) {
      throw new BadRequestException('Data início maior que data fim');
    }

    const [prazo] = await this.dataSource.query(
      `
    SELECT PK_PRAZO
    FROM FK2_MCAL_TB_PRAZO
    WHERE PK_PRAZO = :pkPrazo
      AND NVL(ACTIVE_STATE, 1) = 1
    FETCH FIRST 1 ROWS ONLY
    `,
      { pkPrazo } as any,
    );

    if (!prazo) {
      throw new NotFoundException('Prazo académico não encontrado');
    }

    await this.dataSource.query(
      `
    UPDATE FK2_MCAL_TB_PRAZO
    SET OBSERVACAO = :observacao,
        FK_SEMESTRE = :fkSemestre,
        DATA_INICIO = :dataInicio,
        DATA_FIM = :dataFim,
        FK_TIPO_AVALIACAO = :fkTipoAvaliacao,
        FK_TIPO_PRAZO = :fkTipoPrazo,
        TIPO_CANDIDATURA = :tipoCandidatura,
        UPDATED_BY = :updatedBy,
        UPDATED_AT = SYSDATE
    WHERE PK_PRAZO = :pkPrazo
      AND NVL(ACTIVE_STATE, 1) = 1
    `,
      {
        pkPrazo,
        observacao: observacao ?? null,
        fkSemestre: fk_semestre,
        dataInicio,
        dataFim,
        fkTipoAvaliacao: fk_tipo_avaliacao ?? null,
        fkTipoPrazo: fk_tipo_prazo,
        tipoCandidatura: tipo_candidatura,
        updatedBy,
      } as any,
    );

    return {
      pk_prazo: pkPrazo,
      success: true,
      message: 'Prazo académico editado com sucesso',
    };
  }

  async deleteAcademicActivityTerm(pkPrazo: number) {
    const [prazo] = await this.dataSource.query(
      `
      SELECT PK_PRAZO
      FROM FK2_MCAL_TB_PRAZO
      WHERE PK_PRAZO = :pkPrazo
        AND NVL(ACTIVE_STATE, 1) = 1
      FETCH FIRST 1 ROWS ONLY
      `,
      { pkPrazo } as any,
    );

    if (!prazo) {
      throw new NotFoundException('Prazo académico não encontrado');
    }

    await this.dataSource.query(
      `
      UPDATE FK2_MCAL_TB_PRAZO
      SET ACTIVE_STATE = 0,
          UPDATED_AT = SYSDATE
      WHERE PK_PRAZO = :pkPrazo
        AND NVL(ACTIVE_STATE, 1) = 1
      `,
      { pkPrazo } as any,
    );

    return {
      pk_prazo: pkPrazo,
      success: true,
      message: 'Prazo académico eliminado com sucesso',
    };
  }

  async createCalendarActivity(
    body: CreateCalendarActivityDto,
    user: DecodedUserPayload,
  ) {
    const {
      designacao,
      codigo_ano_lectivo,
      codigo_tipo_candidatura,
      codigo_tipo_calendario,
      codigo_utilizador,
      data_inicio,
      data_fim,
    } = body;

    const codigoUtilizador = this.getCodigoUtilizador(user, codigo_utilizador);

    if (!codigoUtilizador) {
      throw new UnauthorizedException('Utilizador autenticado não encontrado');
    }

    const dataInicio = new Date(data_inicio);
    const dataFim = new Date(data_fim);

    if (Number.isNaN(dataInicio.getTime()) || Number.isNaN(dataFim.getTime())) {
      throw new BadRequestException('Data de início ou data de fim inválida');
    }

    if (dataInicio > dataFim) {
      throw new BadRequestException('Data início maior que data fim');
    }

    return this.dataSource.transaction(async (manager) => {
      const [anoLectivo] = await manager.query(
        `
        SELECT CODIGO
        FROM FK2_TB_ANO_LECTIVO
        WHERE CODIGO = :codigoAnoLectivo
          AND FASE_ANOLECTIVO in ('${EstadoAnoLectivoType.ACTIVO}', '${EstadoAnoLectivoType.CONFIGURAVEL}', '${EstadoAnoLectivoType.USAVEL}')
        FETCH FIRST 1 ROWS ONLY
        `,
        { codigoAnoLectivo: codigo_ano_lectivo } as any,
      );

      if (!anoLectivo) {
        throw new BadRequestException(
          'Deves cadastrar em um ano lectivo ativo',
        );
      }

      const [tipoCalendario] = await manager.query(
        `
        SELECT CODIGO
        FROM FK2_TB_TIPO_CALENDARIO
        WHERE CODIGO = :codigoTipoCalendario
        FETCH FIRST 1 ROWS ONLY
        `,
        { codigoTipoCalendario: codigo_tipo_calendario } as any,
      );

      if (!tipoCalendario) {
        throw new BadRequestException('Tipo de calendário não encontrado');
      }

      const [tipoCandidatura] = await manager.query(
        `
        SELECT ID
        FROM FK2_TB_TIPO_CANDIDATURA
        WHERE ID = :codigoTipoCandidatura
        FETCH FIRST 1 ROWS ONLY
        `,
        { codigoTipoCandidatura: codigo_tipo_candidatura } as any,
      );

      if (!tipoCandidatura) {
        throw new BadRequestException('Tipo de candidatura não encontrado');
      }

      const [utilizador] = await manager.query(
        `
        SELECT NOME
        FROM FK2_MCA_TB_UTILIZADOR
        WHERE PK_UTILIZADOR = :codigoUtilizador
        FETCH FIRST 1 ROWS ONLY
        `,
        { codigoUtilizador } as any,
      );

      if (!utilizador) {
        throw new NotFoundException('Utilizador não encontrado');
      }

      const refUtilizador = JSON.stringify({
        pk: codigoUtilizador,
        desc: utilizador.NOME ?? user?.nome ?? user?.username,
      });

      await manager.query(
        `
        INSERT INTO FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS (

          DESCRICAO,
          DATA_INICIO,
          DATA_TERMINO,
          CODIGO_UTILIZADOR,
          CODIGO_ANO_LECTIVO,
          CODIGO_TIPO_CALENDARIO,
          CODIGO_TIPO_CANDIDATURA,
          ATIVE_STATE,
          DATA,
          REF_UTILIZADOR
        ) VALUES (

          :designacao,
          :dataInicio,
          :dataFim,
          :codigoUtilizador,
          :codigoAnoLectivo,
          :codigoTipoCalendario,
          :codigoTipoCandidatura,
          1,
          SYSDATE,
          :refUtilizador
        )
        `,
        {
          designacao,
          dataInicio,
          dataFim,
          codigoUtilizador,
          codigoAnoLectivo: codigo_ano_lectivo,
          codigoTipoCalendario: codigo_tipo_calendario,
          codigoTipoCandidatura: codigo_tipo_candidatura,
          refUtilizador,
        } as any,
      );

      return {
        message: 'Atividade académica cadastrada com sucesso',
      };
    });
  }

  async updateCalendarActivity(
    codigo: number,
    body: CreateCalendarActivityDto,
    user: DecodedUserPayload,
  ) {
    const {
      designacao,
      codigo_ano_lectivo,
      codigo_tipo_candidatura,
      codigo_tipo_calendario,
      codigo_utilizador,
      data_inicio,
      data_fim,
    } = body;

    const codigoUtilizador = this.getCodigoUtilizador(user, codigo_utilizador);

    if (!codigoUtilizador) {
      throw new UnauthorizedException('Utilizador autenticado não encontrado');
    }

    const dataInicio = new Date(data_inicio);
    const dataFim = new Date(data_fim);

    if (Number.isNaN(dataInicio.getTime()) || Number.isNaN(dataFim.getTime())) {
      throw new BadRequestException('Data de início ou data de fim inválida');
    }

    if (dataInicio > dataFim) {
      throw new BadRequestException('Data início maior que data fim');
    }

    return this.dataSource.transaction(async (manager) => {
      const [atividade] = await manager.query(
        `
        SELECT CODIGO
        FROM FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS
        WHERE CODIGO = :codigo
          AND ATIVE_STATE = 1
        FETCH FIRST 1 ROWS ONLY
        `,
        { codigo } as any,
      );

      if (!atividade) {
        throw new NotFoundException('Atividade lectiva não encontrada');
      }

      const [anoLectivo] = await manager.query(
        `
        SELECT CODIGO
        FROM FK2_TB_ANO_LECTIVO
        WHERE CODIGO = :codigoAnoLectivo
          AND STATUS_ = 1
        FETCH FIRST 1 ROWS ONLY
        `,
        { codigoAnoLectivo: codigo_ano_lectivo } as any,
      );

      if (!anoLectivo) {
        throw new BadRequestException(
          'Deves cadastrar em um ano lectivo ativo',
        );
      }

      const [tipoCalendario] = await manager.query(
        `
        SELECT CODIGO
        FROM FK2_TB_TIPO_CALENDARIO
        WHERE CODIGO = :codigoTipoCalendario
        FETCH FIRST 1 ROWS ONLY
        `,
        { codigoTipoCalendario: codigo_tipo_calendario } as any,
      );

      if (!tipoCalendario) {
        throw new BadRequestException('Tipo de calendário não encontrado');
      }

      const [tipoCandidatura] = await manager.query(
        `
        SELECT ID
        FROM FK2_TB_TIPO_CANDIDATURA
        WHERE ID = :codigoTipoCandidatura
        FETCH FIRST 1 ROWS ONLY
        `,
        { codigoTipoCandidatura: codigo_tipo_candidatura } as any,
      );

      if (!tipoCandidatura) {
        throw new BadRequestException('Tipo de candidatura não encontrado');
      }

      const [utilizador] = await manager.query(
        `
        SELECT NOME
        FROM FK2_MCA_TB_UTILIZADOR
        WHERE PK_UTILIZADOR = :codigoUtilizador
        FETCH FIRST 1 ROWS ONLY
        `,
        { codigoUtilizador } as any,
      );

      if (!utilizador) {
        throw new NotFoundException('Utilizador não encontrado');
      }

      const refUtilizador = JSON.stringify({
        pk: codigoUtilizador,
        desc: utilizador.NOME ?? user?.nome ?? user?.username,
      });

      await manager.query(
        `
        UPDATE FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS
        SET DESCRICAO = :designacao,
            DATA_INICIO = :dataInicio,
            DATA_TERMINO = :dataFim,
            CODIGO_UTILIZADOR = :codigoUtilizador,
            CODIGO_ANO_LECTIVO = :codigoAnoLectivo,
            CODIGO_TIPO_CALENDARIO = :codigoTipoCalendario,
            CODIGO_TIPO_CANDIDATURA = :codigoTipoCandidatura,
            REF_UTILIZADOR = :refUtilizador
        WHERE CODIGO = :codigo
          AND ATIVE_STATE = 1
        `,
        {
          codigo,
          designacao,
          dataInicio,
          dataFim,
          codigoUtilizador,
          codigoAnoLectivo: codigo_ano_lectivo,
          codigoTipoCalendario: codigo_tipo_calendario,
          codigoTipoCandidatura: codigo_tipo_candidatura,
          refUtilizador,
        } as any,
      );

      return {
        codigo,
        success: true,
        message: 'Atividade lectiva editada com sucesso',
      };
    });
  }

  async deleteCalendarActivity(codigo: number) {
    const [atividade] = await this.dataSource.query(
      `
      SELECT CODIGO
      FROM FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS
      WHERE CODIGO = :codigo
        AND ATIVE_STATE = 1
      FETCH FIRST 1 ROWS ONLY
      `,
      { codigo } as any,
    );

    if (!atividade) {
      throw new NotFoundException('Atividade lectiva não encontrada');
    }

    await this.dataSource.query(
      `
      UPDATE FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS
      SET ATIVE_STATE = 0
      WHERE CODIGO = :codigo
        AND ATIVE_STATE = 1
      `,
      { codigo } as any,
    );

    return {
      codigo,
      success: true,
      message: 'Atividade lectiva eliminada com sucesso',
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
      };
    } catch (error) {
      throw new BadRequestException('Erro ao inserir prazo: ' + error.message);
    }
  }
}
