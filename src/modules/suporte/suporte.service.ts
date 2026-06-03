import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, DeepPartial } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FilterSuporteDto } from './dto/filter-suporte.dto';
import { FilterTipoSuporteDto } from './dto/filter-tipo-suporte.dto';
import { UpdateTipoSuporteDto } from './dto/update-tipo-suporte.dto';
import { CreateTipoSuporteDto } from './dto/create-tipo-suporte.dto';
import { CreateRespostaSuporteDto } from './dto/create-resposta-suporte.dto';
import { Suporte } from './entities/suporte.entity';


@Injectable()
export class SuporteService {
  constructor(private readonly dataSource: DataSource) { }
  async list(filter: FilterSuporteDto): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 25,
      search,
      tipo_suporte,
      status,
      codigo_matricula
    } = filter;

    const offset = (page - 1) * limit;

    const params: Record<string, any> = {
      offset,
      limit_plus_offset: offset + limit,
    };

    const countParams: Record<string, any> = {};

    let whereClause = `WHERE 1 = 1`;

    if (tipo_suporte !== undefined && tipo_suporte !== null) {
      whereClause += ` AND c.TIPO_SUPORTE = :tipo_suporte`;
      params.tipo_suporte = Number(tipo_suporte);
      countParams.tipo_suporte = Number(tipo_suporte);
    }

    if (status !== undefined && status !== null) {
      whereClause += ` AND c.STATUS_ = :status`;
      params.status = status;
      countParams.status = status;
    }

    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toUpperCase()}%`;
      whereClause += `
      AND (
        UPPER(pr.NOME_COMPLETO)     LIKE :search
        OR UPPER(c.ASSUNTO)         LIKE :search
        OR UPPER(c.DESCRICAO)       LIKE :search
        OR UPPER(ts.DESCRICAO)      LIKE :search
        OR UPPER(pr.BILHETE_IDENTIDADE) LIKE :search
      )`;
      params.search = searchTerm;
      countParams.search = searchTerm;
    }

    if (codigo_matricula) {
      whereClause += ` AND m.Codigo = :codigo_matricula`;
      params.codigo_matricula = codigo_matricula;
      countParams.codigo_matricula= codigo_matricula;
    }

    const joins = `
    INNER JOIN fk2_users u ON u.ID = c.USER_ID
    INNER JOIN fk2_tb_preinscricao pr ON pr.USER_ID = u.ID
    LEFT JOIN (
      SELECT * FROM (
        SELECT a.*, ROW_NUMBER() OVER (PARTITION BY a.pre_incricao ORDER BY a.codigo DESC) AS rn
        FROM fk2_tb_admissao a
      ) WHERE rn = 1
    ) a ON a.pre_incricao = pr.Codigo
    LEFT JOIN (
      SELECT * FROM (
        SELECT m.*, ROW_NUMBER() OVER (PARTITION BY m.Codigo_Aluno ORDER BY m.Codigo DESC) AS rn
        FROM fk2_tb_matriculas m
      ) WHERE rn = 1
    ) m ON m.Codigo_Aluno = a.codigo
    LEFT JOIN fk2_tipo_suporte ts ON c.TIPO_SUPORTE = ts.ID
  `;

    const countSql = `
    SELECT COUNT(DISTINCT c.ID) AS total
    FROM fk2_contactos c
    ${joins}
    ${whereClause}
  `;

    const countResult = await this.dataSource.query(countSql, countParams as any);
    const total = Number(countResult[0]?.TOTAL ?? 0);

    const dataSql = `
    SELECT *
    FROM (
      SELECT
        pr.NOME_COMPLETO              AS estudante,
        pr.BILHETE_IDENTIDADE         AS bilhete_identidade,
        m.Codigo                      AS codigo_matricula,
        c.DESCRICAO                   AS mensagem,
        c.ASSUNTO                     AS assunto,
        ts.DESCRICAO                  AS descricao_tipo_suporte,
        u.NAME                        AS utilizador,
        TO_CHAR(c.DATA_SOLICITACAO, 'DD/MM/YYYY HH24:MI:SS') AS data_mensagem,
        c.STATUS_                     AS status_mensagem,
        c.ID                          AS contactos_id,
        c.FILE_NAME1                  AS file_name1,
        c.FILE_NAME2                  AS file_name2,
        c.FILE_NAME3                  AS file_name3,
        ROW_NUMBER() OVER (ORDER BY c.DATA_SOLICITACAO DESC) AS rn
      FROM fk2_contactos c
      ${joins}
      ${whereClause}
    ) t
    WHERE rn BETWEEN (:offset + 1) AND :limit_plus_offset
    ORDER BY rn
  `;

    const result = await this.dataSource.query(dataSql, params as any);

    const data = result.map((row: any) => {
      const { RN, ...item } = row;
      return item;
    });

    return {
      data: await toLowerCaseKeys(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: number): Promise<any> {
    const result = await this.dataSource.query(
      `
    SELECT
      pr.NOME_COMPLETO       AS estudante,
      c.DESCRICAO            AS mensagem,
      c.ASSUNTO              AS assunto,
      ts.DESCRICAO           AS descricao_tipo_suporte,
      u.NAME                 AS utilizador,
      TO_CHAR(c.DATA_SOLICITACAO, 'DD/MM/YYYY HH24:MI:SS') AS data_mensagem,
      c.STATUS_              AS status_mensagem,
      c.ID                   AS contactos_id,
      cr.DESCRICAO           AS mensagem_resposta,
      TO_CHAR(cr.CREATED_AT, 'DD/MM/YYYY HH24:MI:SS')      AS data_resposta,
      cr.FILE_NAME1          AS file_name1,
      cr.FILE_NAME2          AS file_name2,
      cr.FILE_NAME3          AS file_name3,
      ut.NOME                AS nome_usuario_resposta,
      cr.ID                  AS resposta_id,              -- ID da resposta (se existir)
      cr.USER_ID             AS resposta_user_id
    FROM fk2_contactos c
    INNER JOIN fk2_users u
        ON u.ID = c.USER_ID 
    INNER JOIN fk2_tb_preinscricao pr
        ON pr.USER_ID = u.ID
    LEFT JOIN fk2_contactos_respostas cr 
        ON cr.CONTACTOS_ID = c.ID
    LEFT JOIN fk2_tipo_suporte ts
        ON c.TIPO_SUPORTE = ts.ID
    LEFT JOIN FK2_MCA_TB_UTILIZADOR ut
        ON ut.PK_UTILIZADOR = cr.USER_ID 
    WHERE c.ID = :id
    ORDER BY cr.CREATED_AT DESC  -- caso haja múltiplas respostas, a mais recente primeiro
    `,
      { id } as any,
    );



    // Como pode haver múltiplas respostas, mas normalmente mostramos a última ou todas
    // Aqui retorno a solicitação + a resposta mais recente (ou array se quiseres todas)
    const solicitacao = result[0]; // a primeira linha já tem os dados principais

    // Se quiseres retornar TODAS as respostas (thread completo), podes agrupar:
    const respostas = result
      .filter(row => row.MENSAGEM_RESPOSTA !== null)
      .map(row => ({
        resposta_id: row.RESPOSTA_ID,
        mensagem_resposta: row.MENSAGEM_RESPOSTA,
        data_resposta: row.DATA_RESPOSTA,
        file_name1: row.FILE_NAME1,
        file_name2: row.FILE_NAME2,
        file_name3: row.FILE_NAME3,
        nome_usuario_resposta: row.NOME_USUARIO_RESPOSTA,
        resposta_user_id: row.RESPOSTA_USER_ID,
      }));

    const response = {
      ...solicitacao,
      respostas, // array de respostas (pode ser vazio)
    };

    // Remove campos duplicados / internos que não interessam no frontend
    const { RESPOSTA_ID, RESPOSTA_USER_ID, ...cleanResponse } = response;

    return await toLowerCaseKeys(cleanResponse);
  }
  async listTiposSuporte(
    filter: FilterTipoSuporteDto,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 25,
      search,
    } = filter;

    const offset = (page - 1) * limit;

    const params: Record<string, any> = {
      offset,
      limit_plus_offset: offset + limit,
    };

    let countParams: Record<string, any> = {};

    let whereClause = `WHERE 1 = 1`;

    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toUpperCase()}%`;
      whereClause += ` AND UPPER(DESCRICAO) LIKE :search`;
      params.search = searchTerm;
      countParams.search = searchTerm;
    }

    // Contagem total
    const countSql = `
    SELECT COUNT(*) AS total
    FROM FK2_TIPO_SUPORTE
    ${whereClause}
  `;

    const countResult = await this.dataSource.query(countSql, countParams as any);
    const total = Number(countResult[0]?.TOTAL ?? 0);

    // Query paginada
    const dataSql = `
    SELECT *
    FROM (
      SELECT
        ID,
        DESCRICAO,
        ROW_NUMBER() OVER (ORDER BY DESCRICAO ASC) AS rn
      FROM FK2_TIPO_SUPORTE
      ${whereClause}
    ) t
    WHERE rn BETWEEN (:offset + 1) AND :limit_plus_offset
    ORDER BY rn
  `;

    const result = await this.dataSource.query(dataSql, params as any);

    const data = result.map((row: any) => {
      const { RN, ...item } = row;
      return item;
    });

    return {
      data: await toLowerCaseKeys(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async createTipoSuporte(dto: CreateTipoSuporteDto): Promise<{ id: number; descricao: string }> {
    const result = await this.dataSource.query(
      `INSERT INTO FK2_TIPO_SUPORTE (DESCRICAO) 
       VALUES (:descricao)
       `,
      { descricao: dto.descricao.trim() } as any,
    );

    return result[0];
  }

  async findAllTiposSuporte(): Promise<any[]> {
    const result = await this.dataSource.query(`
      SELECT 
        ID,
        DESCRICAO
      FROM FK2_TIPO_SUPORTE
      ORDER BY DESCRICAO ASC
    `);

    return await toLowerCaseKeys(result);
  }

  async findOneTipoSuporte(id: number): Promise<any> {
    const result = await this.dataSource.query(
      `
      SELECT 
        ID,
        DESCRICAO
      FROM FK2_TIPO_SUPORTE
      WHERE ID = :id
      `,
      { id } as any,
    );

    if (!result.length) {
      throw new NotFoundException(`Tipo de suporte com ID ${id} não encontrado`);
    }

    return await toLowerCaseKeys(result[0]);
  }

  async updateTipoSuporte(id: number, dto: UpdateTipoSuporteDto): Promise<any> {
    if (!dto.descricao) {
      throw new BadRequestException('Nenhum campo para atualizar');
    }

    const result = await this.dataSource.query(
      `
      UPDATE FK2_TIPO_SUPORTE
      SET DESCRICAO = :descricao
      WHERE ID = :id
      
      `,
      {
        descricao: dto.descricao.trim(),
        id,
      } as any,
    );



    return await toLowerCaseKeys(result[0]);
  }

  async removeTipoSuporte(id: number): Promise<{ message: string }> {
    // Verifica se existe
    const exists = await this.dataSource.query(
      `SELECT 1 FROM FK2_TIPO_SUPORTE WHERE ID = :id`,
      { id } as any,
    );

    if (!exists.length) {
      throw new NotFoundException(`Tipo de suporte com ID ${id} não encontrado`);
    }

    // Verifica se está em uso (opcional mas recomendado)
    const inUse = await this.dataSource.query(
      `SELECT 1 FROM fk2_contactos WHERE TIPO_SUPORTE = :id  FETCH FIRST 1 ROWS ONLY`,
      { id } as any,
    );

    if (inUse.length) {
      throw new BadRequestException(
        'Não é possível eliminar: este tipo de suporte está associado a pedidos existentes',
      );
    }

    await this.dataSource.query(
      `DELETE FROM FK2_TIPO_SUPORTE WHERE ID = :id`,
      { id } as any,
    );

    return { message: `Tipo de suporte com ID ${id} eliminado com sucesso` };
  }
  async responderSolicitacao(
    dto: CreateRespostaSuporteDto,
    userId: number,
  ): Promise<any> {
    return this.dataSource.transaction(async (manager) => {
      const resposta = manager.create(Suporte, {
        descricao: dto.descricao.trim(),
        userId,
        contactosId: dto.contactos_id,
        status: 1,
        fileName1: dto.file_name1 ?? null,
        fileName2: dto.file_name2 ?? null,
        fileName3: dto.file_name3 ?? null,
      } as DeepPartial<Suporte>);

      await manager.save(resposta);


      await manager.query(
        `
  UPDATE fk2_contactos
  SET STATUS_ = :novoStatus
  WHERE ID = :contactos_id
  `,
        { novoStatus: 'respondido', contactos_id: dto.contactos_id } as any
      );

      return {
        mensagem: 'Resposta registada com sucesso e solicitação marcada como respondida',

      };
    });
  }

}