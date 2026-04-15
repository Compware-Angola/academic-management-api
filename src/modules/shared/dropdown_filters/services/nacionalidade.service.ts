import { Injectable } from "@nestjs/common";
import { toLowerCaseKeys } from "src/modules/util/toLowerCaseKeys";
import { DataSource } from "typeorm";

@Injectable()
export class NacionalidadeService {
    constructor(private readonly dataSource: DataSource) {}
    async getNacionalidades() {
        const result = await this.dataSource.query(`SELECT CODIGO AS value, DESIGNACAO AS label FROM FK2_TB_NACIONALIDADES ORDER BY DESIGNACAO ASC`);
        return toLowerCaseKeys(result);
    }
}