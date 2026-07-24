import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { toLowerCaseKeys } from "src/modules/util/toLowerCaseKeys";




@Injectable()
export class GrauAcademicoService {
    constructor(private readonly dataSource: DataSource) { }
    async getGrauAcademicoDropdown() {
        const sql = `
    SELECT 
    DESIGNACAO As label,
    CODIGO as codigo
    FROM FK2_TB_GRAU_ACADEMICO
    WHERE STATUS_ = 1
    ORDER BY DESIGNACAO ASC
  `;

        try {
            const result = await this.dataSource.query(sql);
            return toLowerCaseKeys(result);
        } catch (error) {
            console.error('Erro ao buscar graus academicos:', error);
            throw new InternalServerErrorException(`Falha ao buscar graus academicos: ${error.message}`);
        }
    }
}