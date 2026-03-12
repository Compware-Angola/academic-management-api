import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { toLowerCaseKeys } from "src/modules/util/toLowerCaseKeys";
import { DataSource } from "typeorm";


@Injectable()
export class CategoriaDocenteService {
    constructor(private readonly dataSource: DataSource) { }
   async getCategoriaDropdown() {
  const sql = `
    SELECT 
      CODIGO AS value,
      DESIGNACAO AS label
    FROM FK2_TB_CATEGORIA_DOCENTE
    ORDER BY DESIGNACAO ASC
  `;

  try {
    const result = await this.dataSource.query(sql);
    return toLowerCaseKeys(result);
  } catch (error) {
    console.error('Erro ao buscar categorias de docente:', error);
    throw new InternalServerErrorException(`Falha ao buscar categorias de docente: ${error.message}`);
  }
}
}