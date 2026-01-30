// src/utils/ano-lectivo.util.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AnoLectivoUtil {
  private readonly FALLBACK_ANO_ID = 23;
  private static cachedAnoId: number | null = null;
  private static lastFetched = 0;
  private static readonly CACHE_TTL = 1000 * 60 * 1000; // 

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Retorna o ID (Codigo) do ano letivo ativo usando query nativa
   * com cache em memória + fallback
   */
  async getAnoAtualId(): Promise<number> {
    const now = Date.now();

    // 1. Retorna do cache em memória se ainda válido
    if (
      AnoLectivoUtil.cachedAnoId !== null &&
      now - AnoLectivoUtil.lastFetched < AnoLectivoUtil.CACHE_TTL
    ) {
      return AnoLectivoUtil.cachedAnoId;
    }

    try {
      const sql = `
        SELECT Codigo
        FROM FK2_TB_ANO_LECTIVO  -- ajuste o nome real da tabela se for diferente
        WHERE estado = 'Ativo'
        LIMIT 1
      `;

      const result = await this.dataSource.query(sql);

      let anoId: number;

      if (result && result.length > 0) {
        anoId = Number(result[0].Codigo);
      } else {
        anoId = this.FALLBACK_ANO_ID;
      }

      // Atualiza cache em memória
      AnoLectivoUtil.cachedAnoId = anoId;
      AnoLectivoUtil.lastFetched = now;

      return anoId;
    } catch (error) {
      console.warn(
        'Erro ao buscar ano letivo ativo via query nativa:',
        error instanceof Error ? error.message : error,
      );

      // Em erro → usa cache antigo (se existir) ou fallback
      return AnoLectivoUtil.cachedAnoId ?? this.FALLBACK_ANO_ID;
    }
  }

  /**
   * Limpa o cache em memória (útil para testes, admin ou debug)
   */
  static clearCache() {
    this.cachedAnoId = null;
    this.lastFetched = 0;
  }
}