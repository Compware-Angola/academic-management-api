import { DataSource } from 'typeorm';

type TypeStudentParams = {
  codigoMatricula: number;
  codigoAnoLectivo: number;
  semestre: number;
};
const enum TypeStudentEnum {
  BOLSEIRO_COM_RENUNCIA = 1,
  BOLSEIRO_SEM_RENUNCIA = 2,
  BOLSEIRO_COM_DESCONTO = 0,
}

export interface TypeStudentStrategy {
  execute(dataSource: DataSource, params: TypeStudentParams): Promise<boolean>;
}

export abstract class BaseTypeStudentStrategy implements TypeStudentStrategy {
  protected abstract apply(conditions: string[], params: any): void;

  async execute(
    dataSource: DataSource,
    params: TypeStudentParams,
  ): Promise<boolean> {
    const { codigoAnoLectivo, codigoMatricula, semestre } = params;

    const conditions: string[] = [];
    const queryParams: any = {
      codigoAnoLectivo,
      codigoMatricula,
      semestre,
      status: 0,
    };

    // condições base
    conditions.push(`tb.codigo_anoLectivo = :codigoAnoLectivo`);
    conditions.push(`tb.codigo_matricula = :codigoMatricula`);
    conditions.push(`tb.semestre = :semestre`);
    conditions.push(`tb.status = :status`);

    this.apply(conditions, queryParams);

    const sql = `
      SELECT 1
      FROM fk2_tb_bolseiros tb
      INNER JOIN fk2_tb_instituicao i
        ON i.codigo = tb.codigo_instituicao
      WHERE ${conditions.join(' AND ')}
    `;

    const result = await dataSource.query(sql, queryParams);

    return result.length > 0;
  }
}
export class BolseiroComRenunciaStrategy extends BaseTypeStudentStrategy {
  protected apply(conditions: string[]): void {
    conditions.push(`i.RENUNCIA = 1`);
  }
}
export class BolseiroSemRenunciaStrategy extends BaseTypeStudentStrategy {
  protected apply(conditions: string[]): void {
    conditions.push(`i.RENUNCIA = 0`);
  }
}
export class BolseiroComDescontoStrategy extends BaseTypeStudentStrategy {
  protected apply(conditions: string[], params: any): void {
    conditions.push(`tb.CODIGO_TIPO_BOLSA = :tipoBolsa`);
    params.tipoBolsa = 32;
  }
}
export class TypeStudentStrategyFactory {
  static get(type: TypeStudentEnum): TypeStudentStrategy {
    switch (type) {
      case TypeStudentEnum.BOLSEIRO_COM_RENUNCIA:
        return new BolseiroComRenunciaStrategy();

      case TypeStudentEnum.BOLSEIRO_SEM_RENUNCIA:
        return new BolseiroSemRenunciaStrategy();

      case TypeStudentEnum.BOLSEIRO_COM_DESCONTO:
        return new BolseiroComDescontoStrategy();

      default:
        throw new Error('Tipo inválido');
    }
  }
}

export class TypeStudent {
  static async getType(
    dataSource: DataSource,
    params: TypeStudentParams,
  ): Promise<string> {
    const strategies = [
      {
        type: TypeStudentEnum.BOLSEIRO_COM_RENUNCIA,
        code: 'T4',
      },
      {
        type: TypeStudentEnum.BOLSEIRO_SEM_RENUNCIA,
        code: 'T3',
      },
      {
        type: TypeStudentEnum.BOLSEIRO_COM_DESCONTO,
        code: 'T2',
      },
    ];

    for (const item of strategies) {
      const strategy = TypeStudentStrategyFactory.get(item.type);
      const result = await strategy.execute(dataSource, params);

      if (result) {
        return item.code;
      }
    }

    return 'T1';
  }
}
