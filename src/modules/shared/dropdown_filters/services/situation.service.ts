import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { toLowerCaseKeys } from "src/modules/util/toLowerCaseKeys";

@Injectable()
export class SituationService {
    constructor(private readonly dataSource: DataSource) {}
    
    async situation(): Promise<any> {
        const query = `SELECT DESIGNACAO AS label, CODIGO AS value FROM FK2_TB_SITUACAO`
        const result = await this.dataSource.query(query)
        return toLowerCaseKeys(result)
    }

  async reasonSituation(estado?: number): Promise<any> {

    const baseQuery = `
        SELECT 
            DESIGNACAO AS label,
            CODIGO AS value
        FROM FK2_TB_MOTIVO_SITUACAO
    `;

    if (!estado) {
        const result = await this.dataSource.query(baseQuery);
        return toLowerCaseKeys(result);
    }

    const result = await this.dataSource.query(
        baseQuery + ` WHERE ESTADO_SITUACAO = :1`,
        [estado]
    );

    return toLowerCaseKeys(result);
}
}