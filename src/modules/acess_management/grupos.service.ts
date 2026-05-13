// src/grupos/grupos.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FilterGrupoDto } from './dto/filter-grupo.dto';
import { GrupoResponseDto } from './dto/grupo.response.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindUserByGrupoDTO } from './dto/find-user-by-grupo.dto';

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
      return result.map((row) => new GrupoResponseDto(row));
    } catch (error) {
      console.error('Erro ao listar grupos:', error);
      throw new InternalServerErrorException('Falha ao listar grupos');
    }
  }
  async findUserByGrupo(filters: FindUserByGrupoDTO) {
    const { pkUser, pkGrupo, nome, limit = 25, page = 1 } = filters;

    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any = {};

    conditions.push(`1=1`);
    conditions.push(`ut.ACTIVE_STATE = 1`);

    if (pkGrupo) {
      conditions.push(`g.PK_GRUPO = :grupo`);
      params.grupo = pkGrupo;
    }

    if (pkUser) {
      conditions.push(`ut.pk_utilizador = :user`);
      params.user = pkUser;
    }
    if (nome) {
      conditions.push(`
      (
        LOWER(ut.NOME) LIKE LOWER(:search)
        OR LOWER(ut.USERNAME) LIKE LOWER(:search)
        OR LOWER(ut.EMAIL) LIKE LOWER(:search)
        OR TO_CHAR(ut.PK_UTILIZADOR) LIKE :search
      )
    `);

      params.search = `%${nome}%`;
    }

    const whereClause = conditions.join(' AND ');

    const sqlCommand = `
    select
        ut.nome,
        ut.username,
        ut.email,
        ut.active_state,
        ut.fotoname,
        ut.pk_utilizador as codigo_utilizador,
        g.pk_grupo       as codigo_grupo
    from fk2_mca_tb_grupo_utilizador gu

    inner join fk2_mca_tb_utilizador ut
        on ut.pk_utilizador = gu.fk_utilizador

    inner join fk2_mca_tb_grupo g
        on g.pk_grupo = gu.fk_grupo

    where ${whereClause}

    order by ut.nome asc
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;

    const sqlCount = `
    SELECT COUNT(*) AS TOTAL

    FROM FK2_MCA_TB_GRUPO_UTILIZADOR gu

    INNER JOIN FK2_MCA_TB_UTILIZADOR ut
        ON ut.PK_UTILIZADOR = gu.FK_UTILIZADOR

    INNER JOIN FK2_MCA_TB_GRUPO g
        ON g.PK_GRUPO = gu.FK_GRUPO

    WHERE ${whereClause}
  `;

    const sqlParams = {
      ...params,
      offset,
      limit,
    };

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sqlCommand, sqlParams),
      this.dataSource.query(sqlCount, params),
    ]);

    const total = Number(countResult[0].TOTAL);
    const totalPages = Math.ceil(total / limit);

    return {
      data: await toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages,
    };
  }
}
