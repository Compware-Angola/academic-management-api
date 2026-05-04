import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PrazoResponse } from './type';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

@Injectable()
export class PrazosService {
  constructor(private readonly dataSource: DataSource) {}

  async prazoInscricoesRecurso(anoLectivo: number): Promise<PrazoResponse> {
    const sql = `
      SELECT 
        data_inicio,
        data_termino,
        CASE 
          WHEN TRUNC(SYSDATE) < TRUNC(data_inicio) THEN 'ANTES'
          WHEN TRUNC(SYSDATE) > TRUNC(data_termino) THEN 'DEPOIS'
          WHEN TRUNC(SYSDATE) BETWEEN TRUNC(data_inicio) AND TRUNC(data_termino) THEN 'DURANTE'
          ELSE 'DESCONHECIDO'
        END AS SITUACAO
      FROM FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS
      WHERE codigo_ano_lectivo = :anoLectivo
        AND codigo_tipo_calendario = 9
        AND codigo_tipo_candidatura = 1
      FETCH FIRST 1 ROWS ONLY
    `;
      const rows = toLowerCaseKeys(await this.dataSource.query(sql, [anoLectivo]));
      
      if (!rows || rows.length === 0) {
        return {
          status: 'NAO_CONFIGURADO',
          podeInscrever: false,
          mensagem: 'O calendário de recurso para este ano lectivo não foi configurado.',
          data: { anoLectivo, codigoStatus: null, dataInicio: null, dataFim: null }
        };
      }

      const situacao = rows[0].situacao;
      const dataInicio = rows[0].data_inicio;
      const dataFim = rows[0].data_termino;

      switch (situacao) {
        case 'ANTES':
          return {
            status: 'NAO_DISPONIVEL',
            podeInscrever: false,
            mensagem: 'A época para inscrição de Recurso ainda não está disponível!',
            data: { anoLectivo, codigoStatus: null, dataInicio, dataFim }
          };

        case 'DEPOIS':
          return {
            status: 'ENCERRADO',
            podeInscrever: false,
            mensagem: 'A época para inscrição de Recurso terminou.',
            data: { anoLectivo, codigoStatus: null, dataInicio, dataFim }
          };

        case 'DURANTE':
          return {
            status: 'ABERTO',
            podeInscrever: true,
            mensagem: 'Inscrições abertas.',
            data: { anoLectivo, codigoStatus: 1, dataInicio, dataFim }
          };

        default:
          return {
            status: 'NAO_CONFIGURADO',
            podeInscrever: false,
            mensagem: 'Situação de prazo desconhecida.',
            data: { anoLectivo, codigoStatus: null, dataInicio, dataFim }
          };
      }
   
  }
}