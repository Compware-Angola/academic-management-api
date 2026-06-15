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
type ObterPrazoOptions = {
  tipo: TipoCalendario,
  codigo_tipo_candidatura?: number;
  anoLectivoParam?: number;
};
type  ObterPrazoByCodigoo = {
  codigo: number;
  codigo_tipo_candidatura?: number;
  anoLectivoParam?: number;
};

type  VerificarPrazoOptions = {
  tipo: CodigoTipoCalendario;
  anoLectivoParam?: number;
  codigo_tipo_candidatura: number;
};
const CODIGO_TIPO_CANDIDATURA_LICENCIATURA = 1;
@Injectable()
export class PrazosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly anoLectivoUtil: AnoLectivoUtil,
  ) {}

  async obterPrazo(
    options: ObterPrazoOptions
  ): Promise<PrazoResponse> {
    const { tipo, codigo_tipo_candidatura = CODIGO_TIPO_CANDIDATURA_LICENCIATURA, anoLectivoParam } = options;
    const tipoCodigo = TIPO_CALENDARIO_CODIGO[tipo];

    if (!tipoCodigo) {
      throw new BadRequestException('Tipo de calendário inválido.');
    }

    return this.verificarPrazo({tipo:tipoCodigo,anoLectivoParam,codigo_tipo_candidatura});
  }

  async obterPrazoPorCodigo(
    options: ObterPrazoByCodigoo
  ): Promise<PrazoResponse> {
     const { codigo, codigo_tipo_candidatura = CODIGO_TIPO_CANDIDATURA_LICENCIATURA, anoLectivoParam } = options;
    const tipoCodigo = codigo as CodigoTipoCalendario;

    const sql = `
      SELECT CODIGO 
      FROM FK2_TB_TIPO_CALENDARIO 
      WHERE CODIGO = :codigo
      FETCH FIRST 1 ROWS ONLY
    `;

    const [tipo] = await this.dataSource.query(sql, [tipoCodigo]);

    if (!tipo) {
      throw new BadRequestException('Calendário não encontrado.');
    }

    return this.verificarPrazo({tipo:tipoCodigo,anoLectivoParam,codigo_tipo_candidatura});
  }

  private async verificarPrazo(
   options: VerificarPrazoOptions
  ): Promise<PrazoResponse> {
     const { tipo, codigo_tipo_candidatura, anoLectivoParam } = options;
    const mensagens = MENSAGENS_PADRAO[tipo];

    const anoLectivo =
      anoLectivoParam ?? (await this.anoLectivoUtil.getAnoAtualId());

    const sql = `
      SELECT
        data_inicio,
        data_termino,
        CASE
          WHEN TRUNC(SYSDATE) < TRUNC(data_inicio) THEN 'ANTES'
          WHEN TRUNC(SYSDATE) > TRUNC(data_termino) THEN 'DEPOIS'
          WHEN TRUNC(SYSDATE) BETWEEN TRUNC(data_inicio) AND TRUNC(data_termino) THEN 'DURANTE'
          ELSE 'DESCONHECIDO'
        END AS situacao
      FROM FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS
      WHERE codigo_ano_lectivo = :1
        AND codigo_tipo_calendario = :2
        AND ATIVE_STATE = 1
        AND codigo_tipo_candidatura = :3
    `;

    const rows = toLowerCaseKeys(
      await this.dataSource.query(sql, [anoLectivo, tipo, codigo_tipo_candidatura]),
    );

    if (!rows?.length) {
      return {
         codigoTipoCandidatura:codigo_tipo_candidatura,
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
    const prioridade = {
      DURANTE: 1,
      ANTES: 2,
      DEPOIS: 3,
      DESCONHECIDO: 4,
    };

    const melhorPrazo = rows.sort(
      (a, b) => prioridade[a.situacao] - prioridade[b.situacao],
    )[0];

    const {
      situacao,
      data_inicio: dataInicio,
      data_termino: dataFim,
    } = melhorPrazo;

    const dataBase = {
      anoLectivo,
      dataInicio,
      dataFim,
    };

    switch (situacao) {
      case 'ANTES':
        return {
          codigoTipoCandidatura:codigo_tipo_candidatura,
          status: 'NAO_DISPONIVEL',
          podeInscrever: false,
          mensagem: mensagens.antes,
          data: { ...dataBase, codigoStatus: null },
        };

      case 'DEPOIS':
        return {
          codigoTipoCandidatura:codigo_tipo_candidatura,
          status: 'ENCERRADO',
          podeInscrever: false,
          mensagem: mensagens.depois,
          data: { ...dataBase, codigoStatus: null },
        };

      case 'DURANTE':
        return {
           codigoTipoCandidatura:codigo_tipo_candidatura,
          status: 'ABERTO',
          podeInscrever: true,
          mensagem: mensagens.durante,
          data: { ...dataBase, codigoStatus: 1 },
        };

      default:
        return {
           codigoTipoCandidatura:codigo_tipo_candidatura,
          status: 'NAO_CONFIGURADO',
          podeInscrever: false,
          mensagem: 'Situação desconhecida.',
          data: { ...dataBase, codigoStatus: null },
        };
    }
  }
}