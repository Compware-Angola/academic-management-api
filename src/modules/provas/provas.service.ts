import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FilterProvaDto } from './dto/filter-prova.dto';
import { CreateProvaDto } from './dto/create-prova.dto';
import { UpdateProvaDto } from './dto/update-prova.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { gerarHashExterno } from '../util/hash.util';

@Injectable()
export class ProvasService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(filtros: FilterProvaDto) {
    const {
      id,
      userId,
      anoLetivoId,
      dataRealizacao,
      descricao,
      page = 1,
      limit = 10,
    } = filtros;

    const offset = (page - 1) * limit;

    let query = `
      SELECT P.DATA_REALIZACAO,
             P.SENHA_PROVA,
             P.SALA_ID,
             P.TIPO_PROVA_ID,
             P.DISCIPLINA_ID,
             P.ANO_LECTIVO_ID,
             A.DESIGNACAO AS ANO_LETIVO,
             P.USER_ID,
             U.NAME AS USUARIO,
             P.CREATED_AT,
             P.UPDATED_AT,
             P.STATUS_,
             P.DURACAO,
             P.PERIODO_ID,
             P.TEXTO,
             P.DESCRICAO,
             P.PERGUNTAS,
             P.CURSOS,
             P.ID
      FROM FK2_PROVAS P
      JOIN FK2_USERS U ON P.USER_ID = U.ID
      JOIN FK2_TB_ANO_LECTIVO A ON P.ANO_LECTIVO_ID = A.CODIGO
      WHERE 1=1
    `;

    const parameters: any[] = [];
    let paramIndex = 1;

    if (id) {
      query += ` AND P.ID = :${paramIndex}`;
      parameters.push(id);
      paramIndex++;
    }

    if (userId) {
      query += ` AND P.USER_ID = :${paramIndex}`;
      parameters.push(userId);
      paramIndex++;
    }

    if (anoLetivoId) {
      query += ` AND P.ANO_LECTIVO_ID = :${paramIndex}`;
      parameters.push(anoLetivoId);
      paramIndex++;
    }

    if (dataRealizacao) {
      query += ` AND TRUNC(P.DATA_REALIZACAO) = TO_DATE(:${paramIndex}, 'YYYY-MM-DD')`;
      parameters.push(dataRealizacao);
      paramIndex++;
    }

    if (descricao) {
      query += ` AND UPPER(P.DESCRICAO) LIKE :${paramIndex}`;
      parameters.push(`%${descricao.toUpperCase()}%`);
      paramIndex++;
    }

    query += ` ORDER BY P.CREATED_AT DESC`;

    let countQuery = `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_PROVAS P
      JOIN FK2_USERS U ON P.USER_ID = U.ID
      JOIN FK2_TB_ANO_LECTIVO A ON P.ANO_LECTIVO_ID = A.CODIGO
      WHERE 1=1
    `;

    const countParameters: any[] = [];
    let countParamIndex = 1;

    if (id) {
      countQuery += ` AND P.ID = :${countParamIndex}`;
      countParameters.push(id);
      countParamIndex++;
    }

    if (userId) {
      countQuery += ` AND P.USER_ID = :${countParamIndex}`;
      countParameters.push(userId);
      countParamIndex++;
    }

    if (anoLetivoId) {
      countQuery += ` AND P.ANO_LECTIVO_ID = :${countParamIndex}`;
      countParameters.push(anoLetivoId);
      countParamIndex++;
    }

    if (dataRealizacao) {
      countQuery += ` AND TRUNC(P.DATA_REALIZACAO) = TO_DATE(:${countParamIndex}, 'YYYY-MM-DD')`;
      countParameters.push(dataRealizacao);
      countParamIndex++;
    }

    if (descricao) {
      countQuery += ` AND UPPER(P.DESCRICAO) LIKE :${countParamIndex}`;
      countParameters.push(`%${descricao.toUpperCase()}%`);
      countParamIndex++;
    }

    const countResult = await this.dataSource.query(
      countQuery,
      countParameters,
    );
    const total = parseInt(countResult[0]?.TOTAL || '0', 10);

    query += ` OFFSET :${paramIndex} ROWS FETCH NEXT :${paramIndex + 1} ROWS ONLY`;
    parameters.push(offset, limit);

    const result = await this.dataSource.query(query, parameters);

    return {
      data: toLowerCaseKeys(result),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(createProvaDto: CreateProvaDto) {
    let { senhaProva } = createProvaDto;
    const {
      descricao,
      anoLetivoId,
      userId,
      duracao,
      texto,
      perguntas,
      disciplinas,
      cursos,
    } = createProvaDto;

    const anoLetivoExists = await this.dataSource.query(
      `SELECT CODIGO FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :1`,
      [anoLetivoId],
    );

    if (!anoLetivoExists || anoLetivoExists.length === 0) {
      throw new BadRequestException(
        `Ano letivo com ID ${anoLetivoId} não encontrado`,
      );
    }

    const userExists = await this.dataSource.query(
      `SELECT ID FROM FK2_USERS WHERE ID = :1`,
      [userId],
    );

    if (!userExists || userExists.length === 0) {
      throw new BadRequestException(`Usuário com ID ${userId} não encontrado`);
    }

    senhaProva = await gerarHashExterno(senhaProva);

    const query = `
      INSERT INTO FK2_PROVAS (
        DESCRICAO,
        SENHA_PROVA,
        ANO_LECTIVO_ID,
        USER_ID,
        DURACAO,
        TEXTO,
        PERGUNTAS,
        DISCIPLINAS,
        CURSOS,
        STATUS_,
        CREATED_AT
      ) VALUES (
        :1,
        :2,
        :3,
        :4,
        :5,
        :6,
        :7,
        :8,
        :9,
        1,
        SYSDATE
      )
    `;

    await this.dataSource.query(query, [
      descricao,
      senhaProva,
      anoLetivoId,
      userId,
      duracao,
      texto || null,
      perguntas || null,
      disciplinas || null,
      cursos || null,
    ]);

    return {
      message: 'Prova criada com sucesso',
    };
  }

  async update(id: number, updateProvaDto: UpdateProvaDto) {
    let {
      senhaProva,
      anoLetivoId,
      duracao,
      descricao,
      perguntas,
      cursos,
    } = updateProvaDto;

    const provaExists = await this.dataSource.query(
      `SELECT ID FROM FK2_PROVAS WHERE ID = :1`,
      [id],
    );

    if (!provaExists || provaExists.length === 0) {
      throw new NotFoundException(`Prova com ID ${id} não encontrada`);
    }

    if (anoLetivoId) {
      const anoLetivoExists = await this.dataSource.query(
        `SELECT CODIGO FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :1`,
        [anoLetivoId],
      );

      if (!anoLetivoExists || anoLetivoExists.length === 0) {
        throw new BadRequestException(
          `Ano letivo com ID ${anoLetivoId} não encontrado`,
        );
      }
    }

    const updates: string[] = [];
    const parameters: any[] = [];
    let paramIndex = 1;

    if (senhaProva !== undefined) {
      senhaProva = await gerarHashExterno(senhaProva);
      updates.push(`SENHA_PROVA = :${paramIndex}`);
      parameters.push(senhaProva);
      paramIndex++;
    }

    if (anoLetivoId !== undefined) {
      updates.push(`ANO_LECTIVO_ID = :${paramIndex}`);
      parameters.push(anoLetivoId);
      paramIndex++;
    }

    if (duracao !== undefined) {
      updates.push(`DURACAO = :${paramIndex}`);
      parameters.push(duracao);
      paramIndex++;
    }

    if (descricao !== undefined) {
      updates.push(`DESCRICAO = :${paramIndex}`);
      parameters.push(descricao);
      paramIndex++;
    }

    if (perguntas !== undefined) {
      updates.push(`PERGUNTAS = :${paramIndex}`);
      parameters.push(perguntas);
      paramIndex++;
    }

    if (cursos !== undefined) {
      updates.push(`CURSOS = :${paramIndex}`);
      parameters.push(cursos);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new BadRequestException(
        'Nenhum campo para atualizar foi fornecido',
      );
    }

    updates.push(`UPDATED_AT = SYSDATE`);

    const query = `
      UPDATE FK2_PROVAS
      SET ${updates.join(', ')}
      WHERE ID = :${paramIndex}
    `;

    parameters.push(id);

    await this.dataSource.query(query, parameters);

    return {
      message: 'Prova atualizada com sucesso',
    };
  }

  async remove(id: number) {
    const provaExists = await this.dataSource.query(
      `SELECT ID FROM FK2_PROVAS WHERE ID = :1`,
      [id],
    );

    if (!provaExists || provaExists.length === 0) {
      throw new NotFoundException(`Prova com ID ${id} não encontrada`);
    }

    const query = `DELETE FROM FK2_PROVAS WHERE ID = :1`;

    await this.dataSource.query(query, [id]);

    return {
      message: 'Prova removida com sucesso',
    };
  }
}
