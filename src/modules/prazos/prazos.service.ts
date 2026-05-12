import { BadRequestException, Injectable } from '@nestjs/common';

import { DataSource } from 'typeorm';

import { PrazoResponse } from './type';

import {
  CodigoTipoCalendario,
  TipoCalendario,
  TIPO_CALENDARIO_CODIGO,
} from './utils/tipo-calendario.enum';

import { AnoLectivoUtil } from '../util/current-academic-year';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { MENSAGENS_PADRAO } from './utils';

@Injectable()
export class PrazosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly anoLectivoUtil: AnoLectivoUtil,
  ) {}

  async obterPrazo(
    tipo: TipoCalendario,
    anoLectivoParam?: number,
  ): Promise<PrazoResponse> {
    const tipoCodigo = TIPO_CALENDARIO_CODIGO[tipo];

    if (!tipoCodigo) {
      throw new BadRequestException('Tipo de calendário inválido.');
    }

    return this.verificarPrazo(tipoCodigo, anoLectivoParam);
  }

  async obterPrazoPorCodigo(
    codigo: number,
    anoLectivoParam?: number,
  ): Promise<PrazoResponse> {
    const tipoCodigo = codigo as CodigoTipoCalendario;
    const sql = `SELECT CODIGO FROM FK2_TB_TIPO_CALENDARIO WHERE CODIGO = :codigo
  FETCH FIRST 1 ROWS ONLY`;

    const tipo = this.dataSource.query(sql, [tipoCodigo]);

    if (!MENSAGENS_PADRAO[tipoCodigo]) {
      throw new BadRequestException('Código de calendário inválido.');
    }

    return this.verificarPrazo(tipoCodigo, anoLectivoParam);
  }

  private async verificarPrazo(
    tipo: CodigoTipoCalendario,
    anoLectivoParam?: number,
  ): Promise<PrazoResponse> {
    const mensagens = MENSAGENS_PADRAO[tipo];

    const anoLectivo =
      anoLectivoParam ?? (await this.anoLectivoUtil.getAnoAtualId());

    const sql = `
      SELECT
        data_inicio,
        data_termino,

        CASE
          WHEN TRUNC(SYSDATE) < TRUNC(data_inicio)
            THEN 'ANTES'

          WHEN TRUNC(SYSDATE) > TRUNC(data_termino)
            THEN 'DEPOIS'

          WHEN TRUNC(SYSDATE)
            BETWEEN TRUNC(data_inicio)
            AND TRUNC(data_termino)
            THEN 'DURANTE'

          ELSE 'DESCONHECIDO'
        END AS situacao

      FROM FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS

      WHERE codigo_ano_lectivo = :1
        AND codigo_tipo_calendario = :2
        AND codigo_tipo_candidatura = 1

      FETCH FIRST 1 ROWS ONLY
    `;

    const rows = toLowerCaseKeys(
      await this.dataSource.query(sql, [anoLectivo, tipo]),
    );

    if (!rows?.length) {
      return {
        status: 'NAO_CONFIGURADO',

        podeInscrever: false,

        mensagem: mensagens.naoConfigurado,

        data: {
          anoLectivo,
          codigoStatus: null,
          dataInicio: null,
          dataFim: null,
        },
      };
    }

    const {
      situacao,
      data_inicio: dataInicio,
      data_termino: dataFim,
    } = rows[0];

    const dataBase = {
      anoLectivo,
      dataInicio,
      dataFim,
    };

    switch (situacao) {
      case 'ANTES':
        return {
          status: 'NAO_DISPONIVEL',

          podeInscrever: false,

          mensagem: mensagens.antes,

          data: {
            ...dataBase,
            codigoStatus: null,
          },
        };

      case 'DEPOIS':
        return {
          status: 'ENCERRADO',

          podeInscrever: false,

          mensagem: mensagens.depois,

          data: {
            ...dataBase,
            codigoStatus: null,
          },
        };

      case 'DURANTE':
        return {
          status: 'ABERTO',

          podeInscrever: true,

          mensagem: mensagens.durante,

          data: {
            ...dataBase,
            codigoStatus: 1,
          },
        };

      default:
        return {
          status: 'NAO_CONFIGURADO',

          podeInscrever: false,

          mensagem: 'Situação desconhecida.',

          data: {
            ...dataBase,
            codigoStatus: null,
          },
        };
    }
  }
}
