import { ConflictException, Injectable } from '@nestjs/common';

import { DataSource } from 'typeorm/data-source/index.js';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { UpdateParametroDto } from './dto/parametros.dto';


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
      const lowerRecord = toLowerCaseKeys(record);
      
      return {
        ...lowerRecord,
        args: lowerRecord.args ? JSON.parse(lowerRecord.args) : { valor: 0 }
      };
    }),
  };
}

async updateParametro(id: number, updateDto: UpdateParametroDto) {
 
  const argsString = JSON.stringify(updateDto.args);

  await this.dataSource
    .createQueryBuilder()
    .update('FK2_MSA_TB_PARAMETRO')
    .set({
      ARGS: argsString,
      UPDATED_AT: new Date(),
    })
    .where('PK_PARAMETRO = :id', { id })
    .execute();

  return { message: 'Parâmetro atualizado com sucesso' };
}
}