import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateTopicoDto } from './dto/create-topico.dto';
import { UpdateTopicoDto } from './dto/update-topico.dto';
import { FilterTopicoDto } from './dto/filter-topico.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

@Injectable()
export class TopicosService {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(filtros: FilterTopicoDto) {
    const { designacao, anoLetivoId, page = 1, limit = 10 } = filtros;

    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        T.DESIGNACAO,
        T.ANO_LECTIVO_ID,
        A.DESIGNACAO AS ANO_LETIVO,
        T.ARQUIVO,
        T.CREATED_AT,
        T.UPDATED_AT,
        T.ID
      FROM FK2_TOPICOS T
      JOIN FK2_TB_ANO_LECTIVO A ON T.ANO_LECTIVO_ID = A.CODIGO
      WHERE 1=1
    `;

    const parameters: any[] = [];
    let paramIndex = 1;

    if (designacao) {
      query += ` AND UPPER(T.DESIGNACAO) LIKE :${paramIndex}`;
      parameters.push(`%${designacao.toUpperCase()}%`);
      paramIndex++;
    }

    if (anoLetivoId) {
      query += ` AND T.ANO_LECTIVO_ID = :${paramIndex}`;
      parameters.push(anoLetivoId);
      paramIndex++;
    }

    query += ` ORDER BY T.CREATED_AT DESC`;

    const countQuery = `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_TOPICOS T
      JOIN FK2_TB_ANO_LECTIVO A ON T.ANO_LECTIVO_ID = A.CODIGO
      WHERE 1=1
      ${designacao ? ` AND UPPER(T.DESIGNACAO) LIKE :1` : ''}
      ${anoLetivoId ? ` AND T.ANO_LECTIVO_ID = :${designacao ? 2 : 1}` : ''}
    `;

    const countResult = await this.dataSource.query(
      countQuery,
      parameters.slice(0, paramIndex - 1),
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

  async create(createTopicoDto: CreateTopicoDto) {
    const { designacao, anoLetivoId, arquivo } = createTopicoDto;

    const anoLetivoExists = await this.dataSource.query(
      `SELECT CODIGO FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :1`,
      [anoLetivoId],
    );

    if (!anoLetivoExists || anoLetivoExists.length === 0) {
      throw new BadRequestException(
        `Ano letivo com ID ${anoLetivoId} não encontrado`,
      );
    }

    const query = `
      INSERT INTO FK2_TOPICOS (
        DESIGNACAO,
        ANO_LECTIVO_ID,
        ARQUIVO,
        CREATED_AT
      ) VALUES (
        :1,
        :2,
        :3,
        SYSDATE
      )
    `;

    await this.dataSource.query(query, [
      designacao,
      anoLetivoId,
      arquivo || null,
    ]);

    return {
      message: 'Tópico criado com sucesso',
    };
  }

  async update(id: number, updateTopicoDto: UpdateTopicoDto) {
    const { designacao, arquivo } = updateTopicoDto;

    const topicoExists = await this.dataSource.query(
      `SELECT ID FROM FK2_TOPICOS WHERE ID = :1`,
      [id],
    );

    if (!topicoExists || topicoExists.length === 0) {
      throw new NotFoundException(`Tópico com ID ${id} não encontrado`);
    }

    const updates: string[] = [];
    const parameters: any[] = [];
    let paramIndex = 1;

    if (designacao !== undefined) {
      updates.push(`DESIGNACAO = :${paramIndex}`);
      parameters.push(designacao);
      paramIndex++;
    }

    if (arquivo !== undefined) {
      updates.push(`ARQUIVO = :${paramIndex}`);
      parameters.push(arquivo);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new BadRequestException(
        'Nenhum campo para atualizar foi fornecido',
      );
    }

    updates.push(`UPDATED_AT = SYSDATE`);

    const query = `
      UPDATE FK2_TOPICOS
      SET ${updates.join(', ')}
      WHERE ID = :${paramIndex}
    `;

    parameters.push(id);

    await this.dataSource.query(query, parameters);

    return {
      message: 'Tópico atualizado com sucesso',
    };
  }

  async remove(id: number) {
    const topicoExists = await this.dataSource.query(
      `SELECT ID FROM FK2_TOPICOS WHERE ID = :1`,
      [id],
    );

    if (!topicoExists || topicoExists.length === 0) {
      throw new NotFoundException(`Tópico com ID ${id} não encontrado`);
    }

    const query = `DELETE FROM FK2_TOPICOS WHERE ID = :1`;

    await this.dataSource.query(query, [id]);

    return {
      message: 'Tópico removido com sucesso',
    };
  }

  async findOne(id: number) {
    const query = `
      SELECT 
        T.DESIGNACAO,
        T.ANO_LECTIVO_ID,
        A.DESIGNACAO AS ANO_LETIVO,
        T.ARQUIVO,
        T.CREATED_AT,
        T.UPDATED_AT,
        T.ID
      FROM FK2_TOPICOS T
      JOIN FK2_TB_ANO_LECTIVO A ON T.ANO_LECTIVO_ID = A.CODIGO
      WHERE T.ID = :1
    `;

    const result = await this.dataSource.query(query, [id]);

    if (!result || result.length === 0) {
      throw new NotFoundException(`Tópico com ID ${id} não encontrado`);
    }

    return toLowerCaseKeys(result[0]);
  }
}
