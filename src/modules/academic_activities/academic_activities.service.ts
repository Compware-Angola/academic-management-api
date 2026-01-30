import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindMarcacaoPrazoDTO } from './dto/find-marcacao-prova-prazo.dto';

@Injectable()
export class AcademicActivitiesService {
  constructor(private readonly dataSource: DataSource) {}

  async deleteAcademicActivities(codigo: number) {
    const codigoNum = Number(codigo);
    if (isNaN(codigoNum)) {
      throw new BadRequestException(
        'Código do Dia isentos deve ser um número válido',
      );
    }
    await this.findOne(codigoNum);

    const result = await this.dataSource.query(
      `DELETE FROM FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS WHERE CODIGO = :codigoNum`,
      [codigoNum],
    );

    if (result.affected === 0) {
      throw new Error('Actividade Lectiva não encontrado');
    }
    return {
      success: true,
      message: 'Actividade Lectiva  excluído com sucesso',
    };
  }

  async findOne(codigo: number) {
    const codigoNum = Number(codigo);
    if (isNaN(codigoNum)) {
      throw new BadRequestException(
        'Código do Actividade Lectiva deve ser um número válido',
      );
    }
    const activities = await this.dataSource.query(
      `SELECT * FROM FK2_TB_CALENDARIO_ACTIVIDADE_LECTIVAS WHERE CODIGO = :codigoNum`,
      [codigoNum],
    );
  

    if (activities.length === 0) {
      throw new NotFoundException(
        `Actividade Lectiva com código ${codigo} não encontrada`,
      );
    }

    return await toLowerCaseKeys(activities[0]);
  }

  async findMarcacaoProvaPrazo({ anoLectivo, semestre }: FindMarcacaoPrazoDTO) {
    const sqlMarcacaoPrazo = `
      select
          pz.PK_PRAZO   as prazoId,
          av.DESIGNACAO as designacao
      from FK2_MCAL_TB_PRAZO pz
      inner join FK2_MCAL_TB_TIPO_AVALIACAO av on av.PK_TIPO_AVALIACAO = pz.FK_TIPO_AVALIACAO
      where 1=1
      and pz.FK_TIPO_PRAZO= 4
      and pz.FK_ANO_LECTIVO = :anoLectivo
      and pz.FK_SEMESTRE = :semestre
    `;
    const params = {
      anoLectivo,
      semestre,
    };
    const [result] = await Promise.all([
      this.dataSource.query(sqlMarcacaoPrazo, params as any),
    ]);
    return {
      data: await toLowerCaseKeys(result),
    };
  }
}
