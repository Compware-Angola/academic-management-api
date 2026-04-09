import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { toLowerCaseKeys } from "src/modules/util/toLowerCaseKeys";
import { DataSource } from "typeorm";


@Injectable()
export class OcupacaoService {
    constructor(private readonly dataSource: DataSource) { }
    async getOcupacaoDropdown() {
        const sql = `
    SELECT 
      CODIGO AS value,
      DESIGNACAO AS label
    FROM FK2_TB_OCUPACAO
    ORDER BY DESIGNACAO ASC
  `;
        const result = await this.dataSource.query(sql);
        return toLowerCaseKeys(result);
 }
}