import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { toLowerCaseKeys } from "src/modules/util/toLowerCaseKeys";
import { GroupsDto } from "./dto/groups.dto";
import { GroupsFilterDto } from "./dto/filter-groups";

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(private readonly dataSource: DataSource) {}


async findAllGroups(filter: GroupsFilterDto): Promise<{
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const {
    type_group = 1,
    page = 1,
    limit = 25,
    search
  } = filter;

  const offset = (page - 1) * limit;

  // Parâmetros básicos
  const params: any = {
    typeGroup: Number(type_group),
  };

  let whereClause = `
    WHERE g.ACTIVE_STATE = 1
      AND g.FK_TIPO_DE_GRUPO = :typeGroup
      AND g.PK_GRUPO <> 4375
  `;

  if (search) {
    whereClause += `
      AND (
        LOWER(g.DESIGNACAO) LIKE :search
        OR LOWER(g.SIGLA) LIKE :search
      )
    `;
    params.search = `%${search.toLowerCase()}%`;
  }

  // 1️⃣ Consulta para total
  const totalQuery = `
    SELECT COUNT(*) AS total
    FROM FK2_MCA_TB_GRUPO g
    ${whereClause}
  `;
  const totalResult = await this.dataSource.query(totalQuery, params);
  const total = Number(totalResult[0]?.TOTAL || 0);

  // 2️⃣ Consulta para dados paginados
  const dataQuery = `
    SELECT
      g.PK_GRUPO AS codigo,
      g.DESIGNACAO AS designacao,
      g.DESCRICAO AS descricao,
      g.SIGLA AS sigla,
      g.FK_TIPO_DE_GRUPO AS type_group,
      g.ACTIVE_STATE AS active_state,
      g.CREATED_AT AS created_at,
      g.UPDATED_AT AS updated_at,
      NVL((
        SELECT COUNT(*)
        FROM FK2_MCA_TB_GRUPO_UTILIZADOR gu
        WHERE gu.FK_GRUPO = g.PK_GRUPO
          AND gu.ACTIVE_STATE = 1
      ), 0) AS user_count
    FROM FK2_MCA_TB_GRUPO g
    ${whereClause}
    ORDER BY g.DESIGNACAO ASC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;

  params.offset = offset;
  params.limit = limit;

  const groups = await this.dataSource.query(dataQuery, params);

  return {
    data: toLowerCaseKeys(groups),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

 
 async createGroup(dto: GroupsDto, createdBy: number): Promise<any> {
  const query = `
    INSERT INTO FK2_MCA_TB_GRUPO
      (DESIGNACAO, DESCRICAO, SIGLA, FK_TIPO_DE_GRUPO, OBS, ORDEM, MODULOS, ACTIVE_STATE, CREATED_BY, CREATED_AT)
    VALUES
      (:designacao, :descricao, :sigla, :fkTipoDeGrupo, :obs, :ordem, :modulos, :activeState, :createdBy, SYSTIMESTAMP)
  `;

  const params = {
    designacao: dto.designacao,
    descricao: dto.descricao ?? null,
    sigla: dto.sigla ?? null,
    fkTipoDeGrupo: dto.fkTipoDeGrupo,
    obs: dto.obs ?? null,
    ordem: dto.ordem ?? null,
    modulos: dto.modulos ?? null,
    activeState: dto.active_state ?? 1, 
    createdBy
  };

  await this.dataSource.query(query, params as any);

  return { message: 'Grupo criado com sucesso' };
}


  // UPDATE
async updateGroup(pkGrupo: number, dto: GroupsDto, updatedBy: number): Promise<any> {
  const query = `
    UPDATE FK2_MCA_TB_GRUPO
    SET DESIGNACAO = :designacao,
        DESCRICAO = :descricao,
        SIGLA = :sigla,
        FK_TIPO_DE_GRUPO = :fkTipoDeGrupo,
        OBS = :obs,
        ORDEM = :ordem,
        MODULOS = :modulos,
        LAST_UPDATED_BY = :updatedBy,
        UPDATED_AT = SYSTIMESTAMP
    WHERE PK_GRUPO = :pkGrupo
  `;

  const params = {
    designacao: dto.designacao,
    descricao: dto.descricao ?? null,
    sigla: dto.sigla ?? null,
    fkTipoDeGrupo: dto.fkTipoDeGrupo,
    obs: dto.obs ?? null,
    ordem: dto.ordem ?? null,
    modulos: dto.modulos ?? null,
    updatedBy,
    pkGrupo
  };

  await this.dataSource.query(query, params as any);

  return { message: 'Grupo atualizado com sucesso' };
}


  // DELETE (soft delete)
  async deleteGroup(pkGrupo: number, updatedBy: number): Promise<any> {
    const query = `
      UPDATE FK2_MCA_TB_GRUPO
      SET ACTIVE_STATE = 0,
          LAST_UPDATED_BY = :updatedBy,
          UPDATED_AT = SYSTIMESTAMP
      WHERE PK_GRUPO = :pkGrupo
    `;

    await this.dataSource.query(query, { updatedBy, pkGrupo } as any);
    return { message: 'Grupo removido com sucesso' };
  }
}
