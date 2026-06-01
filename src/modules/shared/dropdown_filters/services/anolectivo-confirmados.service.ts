import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from 'src/modules/util/toLowerCaseKeys';

@Injectable()
export class AnoLectivoConfirmadosService {
  constructor(private readonly dataSource: DataSource) {}
  async getAnoLectivoByMatricula(codigoMatricula: number) {
    const sql = `
      SELECT DISTINCT
        an.CODIGO      AS value,
        an.DESIGNACAO  AS label
      FROM FK2_TB_CONFIRMACOES co
      INNER JOIN FK2_TB_ANO_LECTIVO an
        ON an.CODIGO = co.CODIGO_ANO_LECTIVO
      WHERE co.CODIGO_MATRICULA = :codigoMatricula
      ORDER BY an.DESIGNACAO ASC
    `;

    try {
      const result = await this.dataSource.query(sql, [codigoMatricula]);

      return toLowerCaseKeys(result);
    } catch (error) {
      console.error('Erro ao buscar anos lectivos:', error);

      throw new InternalServerErrorException(
        `Falha ao buscar anos lectivos: ${error?.message}`,
      );
    }
  }
}
