import { Injectable, Logger } from "@nestjs/common";
import { toLowerCaseKeys } from "src/modules/util/toLowerCaseKeys";
import { DataSource } from "typeorm";
import { GroupsFilterDto } from "./dto/filter-groups";

@Injectable()
export class GroupsService {

  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async findAllGroups(filter: GroupsFilterDto): Promise<any[]> {
    const {
      type_group = 1,
      page = 1,
      limit = 25,
      search
    } = filter;

    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        g.PK_GRUPO AS codigo,
        g.DESIGNACAO AS designacao,
        g.DESCRICAO AS descricao,
        g.SIGLA AS sigla,
        g.FK_TIPO_DE_GRUPO AS type_group ,
        g.ACTIVE_STATE AS active_state,
        g.CREATED_AT AS created_at,
        g.UPDATED_AT AS updated_at
      FROM FK2_MCA_TB_GRUPO g
      WHERE g.ACTIVE_STATE = 1
        AND g.FK_TIPO_DE_GRUPO = :typeGroup
        AND g.PK_GRUPO <> 4375
    `;

    const params: any = {
      typeGroup: Number(type_group),
      offset,
      limit
    };

    if (search) {
      query += `
        AND (
          LOWER(g.DESIGNACAO) LIKE :search
          OR LOWER(g.SIGLA) LIKE :search
        )
      `;
      params.search = `%${search.toLowerCase()}%`;
    }

    query += `
      ORDER BY g.DESIGNACAO ASC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;
    const rawGroups = await this.dataSource.query(query, params);

    return  toLowerCaseKeys(rawGroups);
  }
}
