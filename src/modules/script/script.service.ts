import { Body, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateDiscountDto } from './dto/create-desconto.dto';

@Injectable()
export class ScriptService {

  constructor(private readonly dataSource: DataSource) { }
  async create_discount(createDiscountDto: CreateDiscountDto) {
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into('FK2_TB_DESCONTOS_ALUNOO')
      .values({
        CODIGO_MATRICULA: createDiscountDto.codigo_matricula,
        CODIGO_TIPO_DESCONTO: createDiscountDto.codigo_tipo_desconto || null,
        ISENTAR_MULTA: createDiscountDto.isentar_multa,
        CODIGO_UTILIZADOR: createDiscountDto.codigo_utilizador,
        TIPO_TAXA_DESCONTO_ESPECIAL: createDiscountDto.tipo_taxa_desconto_especial,
        CANAL: createDiscountDto.canal,
        CODIGO_ANOLECTIVO: createDiscountDto.codigo_anolectivo,
        AFECTACAO: createDiscountDto.afectacao,
        OBSERVACAO: createDiscountDto.observacao,
        INSTITUICAO_ID: createDiscountDto.instituicao_id,
        ESTATUS_DESCONTO_ID: createDiscountDto.estatus_desconto_id,
        SEMESTRE: createDiscountDto.semestre,
        CREATED_AT: new Date(),
      })
      .execute();

    return {
      message: "Desconto criado com sucesso",
    };
  }
}
