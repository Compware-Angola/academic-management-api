// src/grupos/grupos.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FilterGrupoDto } from './dto/filter-grupo.dto';
import { GrupoResponseDto } from './dto/grupo.response.dto';

@Injectable()
export class GruposService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Lista todos os grupos (exceto unitários) com filtro opcional por activeState
   */
  async listarGrupos(filter: FilterGrupoDto): Promise<GrupoResponseDto[]> {
    let whereClause = 'WHERE FK_TIPO_DE_GRUPO != 2';
    const params: any = {};

    if (filter.ativo === 'true') {
      whereClause += ' AND ACTIVE_STATE = 1';
    } else if (filter.ativo === 'false') {
      whereClause += ' AND ACTIVE_STATE = 0';
    }
    // se não vier filtro → traz todos (ativos e inativos), exceto unitários

    const sql = `
      SELECT 
        PK_GRUPO,
        DESIGNACAO,
        SIGLA,
        FK_TIPO_DE_GRUPO,
        ACTIVE_STATE
      FROM FK2_MCA_TB_GRUPO
      ${whereClause}
      ORDER BY DESIGNACAO ASC
    `;

    try {
      const result = await this.dataSource.query(sql, params);
      return result.map(row => new GrupoResponseDto(row));
    } catch (error) {
      console.error('Erro ao listar grupos:', error);
      throw new InternalServerErrorException('Falha ao listar grupos');
    }
  }
}