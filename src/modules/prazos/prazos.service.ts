import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PrazoResponse } from './type';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

export const TIPO_CALENDARIO = {
  RECURSO: 9,
  EXAME_ESPECIAL: 10,
} as const;

export type CodigoTipoCalendario =
  (typeof TIPO_CALENDARIO)[keyof typeof TIPO_CALENDARIO];

interface MensagensPrazo {
  antes: string;
  depois: string;
  naoConfigurado: string;
}

const MENSAGENS_PADRAO: Record<CodigoTipoCalendario, MensagensPrazo> = {
  [TIPO_CALENDARIO.RECURSO]: {
    antes: 'A época para inscrição de Recurso ainda não está disponível!',
    depois: 'A época para inscrição de Recurso terminou.',
    naoConfigurado:
      'O calendário de Recurso para este ano lectivo não foi configurado.',
  },
  [TIPO_CALENDARIO.EXAME_ESPECIAL]: {
    antes:
      'A época para inscrição de Exame Especial ainda não está disponível!',
    depois: 'A época para inscrição de Exame Especial terminou.',
    naoConfigurado:
      'O calendário de Exame Especial para este ano lectivo não foi configurado.',
  },
};

@Injectable()
export class PrazosService {
  constructor(private readonly dataSource: DataSource) {}

  private async verificarPrazo(
    anoLectivo: number,
    codigoTipoCalendario: CodigoTipoCalendario,
    mensagens: MensagensPrazo,
  ): Promise<PrazoResponse> {
    const sql = `
      SELECT 
        data_inicio,
        data_termino,
        CASE 
          WHEN TRUNC(SYSDATE) < TRUNC(data_inicio)                                    THEN 'ANTES'
          WHEN TRUNC(SYSDATE) > TRUNC(data_termino)                                   THEN 'DEPOIS'
          WHEN TRUNC(SYSDATE) BETWEEN TRUNC(data_inicio) AND TRUNC(data_termino)      THEN 'DURANTE'
          ELSE 'DESCONHECIDO'
        END AS SITUACAO
      FROM FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS
      WHERE codigo_ano_lectivo      = :anoLectivo
        AND codigo_tipo_calendario  = :codigoTipoCalendario
        AND codigo_tipo_candidatura = 1
      FETCH FIRST 1 ROWS ONLY
    `;

    const rows = toLowerCaseKeys(
      await this.dataSource.query(sql, [anoLectivo, codigoTipoCalendario]),
    );

    // Calendário não configurado
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
    const dataBase = { anoLectivo, dataInicio, dataFim };

    switch (situacao) {
      case 'ANTES':
        return {
          status: 'NAO_DISPONIVEL',
          podeInscrever: false,
          mensagem: mensagens.antes,
          data: { ...dataBase, codigoStatus: null },
        };

      case 'DEPOIS':
        return {
          status: 'ENCERRADO',
          podeInscrever: false,
          mensagem: mensagens.depois,
          data: { ...dataBase, codigoStatus: null },
        };

      case 'DURANTE':
        return {
          status: 'ABERTO',
          podeInscrever: true,
          mensagem: 'Inscrições abertas.',
          data: { ...dataBase, codigoStatus: 1 },
        };

      default:
        return {
          status: 'NAO_CONFIGURADO',
          podeInscrever: false,
          mensagem: 'Situação de prazo desconhecida.',
          data: { ...dataBase, codigoStatus: null },
        };
    }
  }

  async prazoInscricoesRecurso(anoLectivo: number): Promise<PrazoResponse> {
    return this.verificarPrazo(
      anoLectivo,
      TIPO_CALENDARIO.RECURSO,
      MENSAGENS_PADRAO[TIPO_CALENDARIO.RECURSO],
    );
  }

  async prazoInscricoesExameEspecial(
    anoLectivo: number,
  ): Promise<PrazoResponse> {
    return this.verificarPrazo(
      anoLectivo,
      TIPO_CALENDARIO.EXAME_ESPECIAL,
      MENSAGENS_PADRAO[TIPO_CALENDARIO.EXAME_ESPECIAL],
    );
  }
}
