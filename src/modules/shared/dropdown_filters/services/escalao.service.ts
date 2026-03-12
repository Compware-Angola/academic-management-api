import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { toLowerCaseKeys } from "src/modules/util/toLowerCaseKeys";
import { DataSource } from "typeorm";


@Injectable()
export class EscalaoService {
    constructor(private readonly dataSource: DataSource) { }
    async getEscalaoDropdown() {
        const sql = `
    SELECT 
      CODIGO AS value,
      DESIGNACAO AS label
    FROM FK2_TB_ESCALAO_DOCENTE
    ORDER BY DESIGNACAO ASC
  `;

        try {
            const result = await this.dataSource.query(sql);
            return toLowerCaseKeys(result);
        } catch (error) {
            console.error('Erro ao buscar escalões:', error);
            throw new InternalServerErrorException(`Falha ao buscar escalões: ${error.message}`);
        }
    }
}