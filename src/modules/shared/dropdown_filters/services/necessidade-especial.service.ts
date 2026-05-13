import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { toLowerCaseKeys } from 'src/modules/util/toLowerCaseKeys';
import { DataSource } from 'typeorm';

@Injectable()
export class NecessidadeEspecialService {
  constructor(private readonly dataSource: DataSource) {}
  async getNecessidadeEspecialDropdown() {
    const sql = `
    SELECT
      ID AS value,
      DESIGNACAO AS label
    FROM FK2_NECESSIDADE_ESPECIAIS
    ORDER BY DESIGNACAO ASC
  `;

    try {
      const result = await this.dataSource.query(sql);
      return toLowerCaseKeys(result);
    } catch (error: any) {
      console.error('Erro ao buscar Necessidade Especias:', error);
      throw new InternalServerErrorException(
        `Falha ao buscar Necessidade Especias: ${error.message}`,
      );
    }
  }
}
