import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { toLowerCaseKeys } from "src/modules/util/toLowerCaseKeys";
import { DataSource } from "typeorm";


@Injectable()
export class TipoUCService {
    constructor(private readonly dataSource: DataSource) { }
   async getTipoUcDropdown() {
  const sql = `
    SELECT 
      ID_TIPO_UC AS value,
      NM_TIPO_UC AS label,
      SG_TIPO_UC AS sigla
    FROM CMP_TIPO_UC
   
    ORDER BY NM_TIPO_UC ASC
  `;

  try {
    const result = await this.dataSource.query(sql);
    return toLowerCaseKeys(result);
  } catch (error) {
    console.error('Erro ao buscar tipos de UC:', error);
    throw new InternalServerErrorException(`Falha ao buscar tipos de UC: ${error.message}`);
  }
}
}