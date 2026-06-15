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

  // ─────────────────────────────
  // TIPOS (DADOS)
  // ─────────────────────────────

  async listarTiposCandidatura() {
    const sql = `
      SELECT CODIGO, DESCRICAO
      FROM FK2_TB_TIPO_CANDIDATURA
      WHERE STATUS_ = 1
      ORDER BY CODIGO
    `;

    return this.dataSource.query(sql);
  }

  // ─────────────────────────────
  // API PRINCIPAL
  // ─────────────────────────────

  async obterPrazo(
    tipo: TipoCalendario,
    codigo_tipo_candidatura: number,
    anoLectivoParam?: number,
  ) {
    const tipoCodigo = TIPO_CALENDARIO_CODIGO[tipo];

    if (!tipoCodigo) {
      throw new BadRequestException('Tipo inválido.');
    }

    await this.validarCandidatura(codigo_tipo_candidatura);

    return this.verificarPrazo(
      tipoCodigo,
      codigo_tipo_candidatura,
      anoLectivoParam,
    );
  }

  async obterPrazoPorCodigo(
    codigo: number,
    codigo_tipo_candidatura=1,
    anoLectivoParam?: number,
  ) {
    const [tipo] = await this.dataSource.query(
      `SELECT CODIGO FROM FK2_TB_TIPO_CALENDARIO WHERE CODIGO = :1`,
      [codigo],
    );

    if (!tipo) {
      throw new BadRequestException('Calendário não encontrado.');
    }

    await this.validarCandidatura(codigo_tipo_candidatura);

    return this.verificarPrazo(
      codigo,
      codigo_tipo_candidatura,
      anoLectivoParam,
    );
  }

  // ─────────────────────────────
  // REGRAS DE PRAZO
  // ─────────────────────────────

  private async verificarPrazo(
    tipo: number,
    codigo_tipo_candidatura: number,
    anoLectivoParam?: number,
  ) {
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
        END AS situacao
      FROM FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS
      WHERE codigo_ano_lectivo = :1
        AND codigo_tipo_calendario = :2
        AND codigo_tipo_candidatura = :3
        AND ATIVE_STATE = 1
    `;

    const rows = await this.dataSource.query(sql, [
      anoLectivo,
      tipo,
      codigo_tipo_candidatura,
    ]);

    if (!rows?.length) {
      return {
        status: 'NAO_CONFIGURADO',
        podeInscrever: false,
        mensagem: mensagens.naoConfigurado,
      };
    }

    const row = rows[0];

    switch (row.situacao) {
      case 'ANTES':
        return {
          status: 'NAO_DISPONIVEL',
          podeInscrever: false,
          mensagem: mensagens.antes,
        };

      case 'DEPOIS':
        return {
          status: 'ENCERRADO',
          podeInscrever: false,
          mensagem: mensagens.depois,
        };

      case 'DURANTE':
        return {
          status: 'ABERTO',
          podeInscrever: true,
          mensagem: mensagens.durante,
        };
    }
  }

  // ─────────────────────────────
  // VALIDAÇÃO
  // ─────────────────────────────

  private async validarCandidatura(codigo: number) {
    const sql = `
      SELECT 1
      FROM FK2_TB_TIPO_CANDIDATURA
      WHERE CODIGO = :1
        AND STATUS_ = 1
      FETCH FIRST 1 ROWS ONLY
    `;

    const rows = await this.dataSource.query(sql, [codigo]);

    if (!rows?.length) {
      throw new BadRequestException('Tipo de candidatura inválido.');
    }
  }
}