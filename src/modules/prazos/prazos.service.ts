// prazos.service.ts

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { PrazoResponse } from './type';

import {
  CodigoTipoCalendario,
  TipoCalendario,
  TIPO_CALENDARIO_CODIGO,
} from './tipo-calendario.enum';

import { AnoLectivoUtil } from '../util/current-academic-year';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

interface MensagensPrazo {
  antes: string;
  depois: string;
  naoConfigurado: string;
}

const MENSAGENS_PADRAO: Record<CodigoTipoCalendario, MensagensPrazo> = {
  9: {
    antes: 'A época para inscrição de Recurso ainda não está disponível!',
    depois: 'A época para inscrição de Recurso terminou.',
    naoConfigurado: 'O calendário de Recurso não foi configurado.',
  },

  10: {
    antes:
      'A época para inscrição de Exame Especial ainda não está disponível!',

    depois: 'A época para inscrição de Exame Especial terminou.',

    naoConfigurado: 'O calendário de Exame Especial não foi configurado.',
  },

  11: {
    antes: 'A época para Melhoria de Notas ainda não está disponível!',

    depois: 'A época para Melhoria de Notas terminou.',

    naoConfigurado: 'O calendário de Melhoria de Notas não foi configurado.',
  },

  12: {
    antes: 'A época para Reingresso ainda não está disponível!',

    depois: 'A época para Reingresso terminou.',

    naoConfigurado: 'O calendário de Reingresso não foi configurado.',
  },

  13: {
    antes: 'A época para substituição de UC ainda não está disponível!',

    depois: 'A época para substituição de UC terminou.',

    naoConfigurado: 'O calendário de substituição de UC não foi configurado.',
  },

  14: {
    antes: 'A época para mudança de curso interna ainda não está disponível!',

    depois: 'A época para mudança de curso interna terminou.',

    naoConfigurado:
      'O calendário de mudança de curso interna não foi configurado.',
  },

  15: {
    antes:
      'A inscrição para cadeiras extracurriculares ainda não está disponível!',

    depois: 'A inscrição para cadeiras extracurriculares terminou.',

    naoConfigurado:
      'O calendário de cadeiras extracurriculares não foi configurado.',
  },

  16: {
    antes: 'A época de matrículas ainda não está disponível!',

    depois: 'A época de matrículas terminou.',

    naoConfigurado: 'O calendário de matrículas não foi configurado.',
  },
};

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
        END AS SITUACAO

      FROM FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS

      WHERE codigo_ano_lectivo = :anoLectivo
        AND codigo_tipo_calendario = :tipo
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

          mensagem: 'Inscrições abertas.',

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
