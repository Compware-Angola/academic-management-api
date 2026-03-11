import { Injectable } from '@nestjs/common';
import { CreateDocenteGestaoDto } from './dto/create-docente_gestao.dto';
import { UpdateDocenteGestaoDto } from './dto/update-docente_gestao.dto';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindParametrosDocenteTO } from './dto/find-parametros-docente.dto';

@Injectable()
export class DocenteGestaoService {
  constructor(private readonly dataSource: DataSource) { }
  async getTeacherParameters(dto: FindParametrosDocenteTO) {
    const { page = 1, limit = 10, search } = dto
    const offset = (page - 1) * limit;

    const baseWhere = `
    ACTIVE_STATE = 1
    ${search ? `AND (DESIGNACAO LIKE '%${search}%' OR SIGLA LIKE '%${search}%')` : ''}
  `;

    const sql = `
    SELECT
      PK_PARAMETRO      AS codigo,
      DESIGNACAO        AS designacao,
      DESCRICAO         AS descricao,
      SIGLA             AS sigla,
      ARGS              AS args,
      OBS               AS observacao,
      ORDEM             AS ordem,
      CREATED_AT        AS created_at,
      UPDATED_AT        AS updated_at
    FROM FK2_MGD_TB_PARAMETRO_AFECTACAO
    WHERE ${baseWhere}
    ORDER BY ORDEM ASC
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    const sqlCount = `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_MGD_TB_PARAMETRO_AFECTACAO
    WHERE ${baseWhere}
  `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql),
      this.dataSource.query(sqlCount),
    ]);

    const total = Number(countResult[0].TOTAL);
    const totalPages = Math.ceil(total / limit);

    return {
      data: await toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages,
    };
  }
  async toggleTeacherParameter(id: number) {
  const sqlFind = `
    SELECT PK_PARAMETRO, ARGS
    FROM FK2_MGD_TB_PARAMETRO_AFECTACAO
    WHERE PK_PARAMETRO = ${id}
  `;

  const result = await this.dataSource.query(sqlFind);

  if (!result.length) {
    throw new Error('Parâmetro não encontrado');
  }

  let args;

  try {
    args = JSON.parse(result[0].ARGS);
  } catch {
    throw new Error('ARGS inválido');
  }

  const currentState = args[0]?.state;
  const newState = currentState === 'SIM' ? 'NAO' : 'SIM';

  args[0].state = newState;

  const updatedArgs = JSON.stringify(args);

  const sqlUpdate = `
    UPDATE FK2_MGD_TB_PARAMETRO_AFECTACAO
    SET 
      ARGS = '${updatedArgs}',
      UPDATED_AT = SYSDATE
    WHERE PK_PARAMETRO = ${id}
  `;

  await this.dataSource.query(sqlUpdate);

  return {
    message:
      newState === 'SIM'
        ? 'Parâmetro activado com sucesso'
        : 'Parâmetro desactivado com sucesso',
    state: newState,
  };
}
}
