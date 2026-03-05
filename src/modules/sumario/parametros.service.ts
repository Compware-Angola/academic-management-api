import { ConflictException, Injectable } from '@nestjs/common';

import { DataSource } from 'typeorm/data-source/index.js';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';


@Injectable()
export class ParametrosService {
  constructor(private readonly dataSource: DataSource) { }

 async getParametros() {
  const records = await this.dataSource
    .createQueryBuilder()
    .select([
      'PK_PARAMETRO', 
      'DESIGNACAO', 
      'SIGLA', 
      'DESCRICAO', 
      'ARGS'
    ])
    .from('FK2_MSA_TB_PARAMETRO', 'p')
    .getRawMany();

  return {
    data: records.map(record => {
      // Normaliza as chaves (o Oracle costuma retornar TUDO_EM_MAIUSCULO)
      const lowerRecord = toLowerCaseKeys(record);
      
      return {
        ...lowerRecord,
        args: lowerRecord.args ? JSON.parse(lowerRecord.args) : { valor: 0 }
      };
    }),
  };
}
}