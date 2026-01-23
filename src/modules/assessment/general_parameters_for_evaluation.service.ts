import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { CreateParametroAvaliacaoMutueDto, UpdateParametroAvaliacaoMutueDto } from './dto/parametros-avaliacoes.dto';
import * as oracledb from 'oracledb'
import { UpdateParametroAvaliacaoAttendanceListDto } from './dto/update-parametro-avaliacao-attendance-list.dto';
@Injectable()
export class GeneralParametersForEvaluationService {
  constructor(private readonly dataSource: DataSource) { }

async viewNote(search?: string) {
  let viewql = `
    SELECT
      DESCRICAO,
      OBSERVACAO1,
      OBSERVACAO,
      INFO1,
      INFO2,
      INFO3,
      ACTIVO,
      FUNCAO,
      CREATED_AT,
      UPDATED_AT,
      CODIGO
    FROM
      FK2_TB_PARAMETROS_AVALIACOES_MUTUE
  `;

  const params: Record<string, any> = {};

  if (search != null && search.trim() !== '') {
    const termo = `%${search.trim().toLowerCase()}%`;
    viewql += `
      WHERE
        LOWER(DESCRICAO) LIKE :searchTerm
        OR DESCRICAO = :exactSearch
    `;
    params.searchTerm = termo;
    params.exactSearch = search.trim();
  } else {
    viewql += `
      WHERE ACTIVO = 1
    `;
  }

  viewql += `
    ORDER BY CODIGO ASC
  `;

  const view = await this.dataSource.query(viewql, params as any);

  return toLowerCaseKeys(view);
}


  async createParametro(dto: CreateParametroAvaliacaoMutueDto) {
    const query = `
    INSERT INTO FK2_TB_PARAMETROS_AVALIACOES_MUTUE (
      DESCRICAO,
      OBSERVACAO1,
      OBSERVACAO,
      INFO1,
      INFO2,
      INFO3,
      ACTIVO,
      FUNCAO,
      CREATED_AT
    ) VALUES (
      :descricao,
      :observacao1,
      :observacao,
      :info1,
      :info2,
      :info3,
      :activo,
      :funcao,
      SYSDATE
    )
    RETURNING CODIGO INTO :codigo
  `;

    // Oracle exige tratamento especial para RETURNING com oracledb/TypeORM
    const result = await this.dataSource.query(query, {
      descricao: dto.descricao,
      observacao1: dto.observacao1 || null,
      observacao: dto.observacao || null,
      info1: dto.info1 || null,
      info2: dto.info2 || null,
      info3: dto.info3 || null,
      activo: dto.activo ? 1 : 0,
      funcao: dto.funcao || null,
      codigo: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_NUMBER },
    } as any);

    // Se sua tabela tem sequence + trigger gerando CODIGO automaticamente, o result[0] pode não vir
    // Nesse caso, você pode buscar o novo registro ou confiar no frontend
    // Aqui vamos apenas retornar o DTO com mensagem de sucesso
    return {
      message: 'Parâmetro criado com sucesso',
      data: dto,
    };
  }
  async updateParametro(dto: UpdateParametroAvaliacaoMutueDto, parametroId: number) {
    const query = `
    UPDATE FK2_TB_PARAMETROS_AVALIACOES_MUTUE
    SET 
      DESCRICAO = :descricao,
      OBSERVACAO1 = :observacao1,
      OBSERVACAO = :observacao,
      INFO1 = :info1,
      INFO2 = :info2,
      INFO3 = :info3,
      ACTIVO = :activo,
      FUNCAO = :funcao,
      UPDATED_AT = SYSDATE
    WHERE CODIGO = :codigo
  `;

    const result = await this.dataSource.query(query, {
      descricao: dto.descricao,
      observacao1: dto.observacao1 || null,
      observacao: dto.observacao || null,
      info1: dto.info1 || null,
      info2: dto.info2 || null,
      info3: dto.info3 || null,
      activo: dto.activo ? 1 : 0,
      funcao: dto.funcao || null,
      codigo: parametroId,
    } as any);

    if (result[1] === 0) {
      throw new NotFoundException(`Parâmetro com código ${parametroId} não encontrado`);
    }

    return {
      message: 'Parâmetro atualizado com sucesso',
    };
  }

async attendanceList() {
  let viewql = `
    SELECT
      pg.DESCRICAO,
      pg.OBSERVACAO,
      pg.OBSERVACAO_2,
      pg.OBSERVACAO_3,
      pg.ACTIVO,
      pg.CREATED_AT,
      pg.UPDATED_AT,
      pg.SIGLA,
      pg.DESCRICAO_PARAMETRO,
      pg.MODULO,
      pg.CODIGO,
      NVL(ut."NOME", 'Não definido') AS "ATUALIZADOPOR"
    FROM
      FK2_TB_PARAMETROS_GERAIS_MUTUE pg
      LEFT JOIN "FK2_MCA_TB_UTILIZADOR" ut
        ON JSON_VALUE(pg."OBSERVACAO_2", '$.pk' RETURNING NUMBER) = ut."PK_UTILIZADOR"
    WHERE
      pg.ACTIVO = 1
      AND pg.CODIGO = 16
  `;

  const view = await this.dataSource.query(viewql);
  return toLowerCaseKeys(view);
}
async updateAttendanceList(codigo: number, updateData: UpdateParametroAvaliacaoAttendanceListDto,user) {
  const {
    descricao,
    observacao,
    observacao2,
    observacao3,
    descricaoParametro,
    modulo,
    activo,
  } = updateData;

  let sql = `
    UPDATE FK2_TB_PARAMETROS_GERAIS_MUTUE
    SET
  `;

  const params: Record<string, any> = {};
  const updates: string[] = [];

  if (descricao !== undefined) {
    updates.push(`DESCRICAO = :descricao`);
    params.descricao = descricao;
  }

  if (observacao !== undefined) {
    updates.push(`OBSERVACAO = :observacao`);
    params.observacao = observacao;
  }

  if (user !== undefined) {
  
     const jsonValue = `{"pk":${user.sub},"desc":"${user.nome}","corLetra":"black"}`;
    updates.push(`"OBSERVACAO_2" = :observacao2`);
    params.observacao2 = jsonValue;
  }

  if (observacao3 !== undefined) {
    updates.push(`"OBSERVACAO_3" = :observacao3`);
    params.observacao3 = observacao3;
  }

  if (descricaoParametro !== undefined) {
    updates.push(`DESCRICAO_PARAMETRO = :descricaoParametro`);
    params.descricaoParametro = descricaoParametro;
  }

  if (modulo !== undefined) {
    updates.push(`MODULO = :modulo`);
    params.modulo = modulo;
  }

  if (activo !== undefined) {
    updates.push(`ACTIVO = :activo`);
    params.activo = activo ? 1 : 0;
  }

  // Atualiza sempre o UPDATED_AT (se não houver trigger no banco)
  updates.push(`UPDATED_AT = SYSTIMESTAMP`);

  // Se não houver campos para atualizar (só UPDATED_AT), continua válido
  sql += updates.join(',\n      ');

  sql += `
    WHERE CODIGO = :codigo
  `;

  params.codigo = codigo;
  console.log(params);
  

  const result = await this.dataSource.query(sql, params as any);


  return { message: 'Atualizado com sucesso' };
}

}
