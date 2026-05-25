import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreatePerguntaDto } from './dto/create-pergunta.dto';
import { FilterPerguntaDto } from './dto/filter-pergunta.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { UpdatePerguntaDto } from './dto/update-pergunta.dto';
import { CreateRespostaDto } from './dto/create-resposta.dto';
import { UpdateRespostaDto } from './dto/update-resposta.dto';
import { FilterDisciplinaDto } from './dto/filter-disciplina.dto';
import { FilterTipoPerguntaDto } from './dto/filter-tipo-pergunta.dto';
import { FilterTipoRespostaDto } from './dto/filter-tipo-resposta.dto';

@Injectable()
export class PerguntasService {
  constructor(private readonly dataSource: DataSource) {}

  private readonly tipoRespostaCorretaId = 1;

  async findAll(filtros: FilterPerguntaDto) {
    const { descricao, disciplinaId, id, page = 1, limit = 10 } = filtros;

    const offset = (page - 1) * limit;

    let query = `
      SELECT P.TIPO_PERGUNTA_ID,
             TP.DESIGNACAO TIPO_PERGUNTA,
             P.DISCIPLINA_ID,
             D.DESIGNACAO DISCIPLINA,
             P.COTACAO,
             P.DELETED_AT,
             P.CREATED_AT,
             P.UPDATED_AT,
             P.DESCRICAO,
             P.ID
      FROM FK2_PERGUNTAS P
         , FK2_TB_TIPO_PERGUNTA TP
         , FK2_DISCIPLINA_ADMISSAO D
      WHERE P.TIPO_PERGUNTA_ID = TP.CODIGO
        AND P.DISCIPLINA_ID = D.ID
        AND P.DELETED_AT IS NULL
    `;

    const parameters: any[] = [];
    let paramIndex = 1;

    if (descricao) {
      query += ` AND UPPER(P.DESCRICAO) LIKE :${paramIndex}`;
      parameters.push(`%${descricao.toUpperCase()}%`);
      paramIndex++;
    }

    if (disciplinaId) {
      query += ` AND P.DISCIPLINA_ID = :${paramIndex}`;
      parameters.push(disciplinaId);
      paramIndex++;
    }

    if (id) {
      query += ` AND P.ID = :${paramIndex}`;
      parameters.push(id);
      paramIndex++;
    }

    query += ` ORDER BY P.CREATED_AT DESC`;

    const countQuery = `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_PERGUNTAS P
         , FK2_TB_TIPO_PERGUNTA TP
         , FK2_DISCIPLINA_ADMISSAO D
      WHERE P.TIPO_PERGUNTA_ID = TP.CODIGO
        AND P.DISCIPLINA_ID = D.ID
        AND P.DELETED_AT IS NULL
      ${descricao ? ` AND UPPER(P.DESCRICAO) LIKE :1` : ''}
      ${disciplinaId ? ` AND P.DISCIPLINA_ID = :${disciplinaId ? 2 : 1}` : ''}
      ${id ? ` AND P.ID = :${id ? 2 : 1}` : ''}
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

  async create(createPerguntaDto: CreatePerguntaDto) {
    const { descricao, disciplinaId, tipoPerguntaId, cotacao } =
      createPerguntaDto;

    const query = `
      INSERT INTO FK2_PERGUNTAS (
        TIPO_PERGUNTA_ID,
        DISCIPLINA_ID,
        DESCRICAO,
        COTACAO,
        CREATED_AT
      ) VALUES (
        :1,
        :2,
        :3,
        :4,
        SYSDATE
      )
    `;

    await this.dataSource.query(query, [
      tipoPerguntaId,
      disciplinaId,
      descricao,
      cotacao,
    ]);

    return {
      message: 'Pergunta criada com sucesso',
    };
  }

  async update(id: number, updateTopicoDto: UpdatePerguntaDto) {
    const { descricao, disciplinaId, tipoPerguntaId, cotacao } =
      updateTopicoDto;

    const perguntaExists = await this.dataSource.query(
      `SELECT ID FROM FK2_PERGUNTAS WHERE ID = :1`,
      [id],
    );

    if (!perguntaExists || perguntaExists.length === 0) {
      throw new NotFoundException(`Pergunta com ID ${id} não encontrado`);
    }

    const updates: string[] = [];
    const parameters: any[] = [];
    let paramIndex = 1;

    if (descricao !== undefined) {
      updates.push(`DESCRICAO = :${paramIndex}`);
      parameters.push(descricao);
      paramIndex++;
    }

    if (tipoPerguntaId !== undefined) {
      updates.push(`TIPO_PERGUNTA_ID = :${paramIndex}`);
      parameters.push(tipoPerguntaId);
      paramIndex++;
    }

    if (disciplinaId !== undefined) {
      updates.push(`DISCIPLINA_ID = :${paramIndex}`);
      parameters.push(disciplinaId);
      paramIndex++;
    }

    if (cotacao !== undefined) {
      updates.push(`COTACAO = :${paramIndex}`);
      parameters.push(cotacao);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new BadRequestException(
        'Nenhum campo para atualizar foi fornecido',
      );
    }

    updates.push(`UPDATED_AT = SYSDATE`);

    const query = `
      UPDATE FK2_PERGUNTAS
      SET ${updates.join(', ')}
      WHERE ID = :${paramIndex}
    `;

    parameters.push(id);

    await this.dataSource.query(query, parameters);

    return {
      message: 'Pergunta atualizada com sucesso',
    };
  }

  async findRespostasByPerguntaId(perguntaId: number) {
    const query = `
      SELECT 
        R.DESCRICAO,
        R.TIPO_RESPOSTA_ID,
        TR.DESIGNCAO AS VALOR_RESPOSTA,
        R.PERGUNTA_ID,
        R.CREATED_AT,
        R.UPDATED_AT,
        R.ID
      FROM FK2_RESPOSTAS R
         , FK2_TB_TIPO_RESPOSTA TR
      WHERE R.TIPO_RESPOSTA_ID = TR.CODIGO
        AND R.PERGUNTA_ID = :1
      ORDER BY R.ID
    `;

    const result = await this.dataSource.query(query, [perguntaId]);

    return toLowerCaseKeys(result);
  }

  async createResposta(createRespostaDto: CreateRespostaDto) {
    const { descricao, tipoRespostaId, perguntaId } = createRespostaDto;

    const perguntaExists = await this.dataSource.query(
      `SELECT ID FROM FK2_PERGUNTAS WHERE ID = :1`,
      [perguntaId],
    );

    if (!perguntaExists || perguntaExists.length === 0) {
      throw new NotFoundException(
        `Pergunta com ID ${perguntaId} não encontrada`,
      );
    }

    const tipoRespostaExists = await this.dataSource.query(
      `SELECT CODIGO FROM FK2_TB_TIPO_RESPOSTA WHERE CODIGO = :1`,
      [tipoRespostaId],
    );

    if (!tipoRespostaExists || tipoRespostaExists.length === 0) {
      throw new BadRequestException(
        `Tipo de resposta com ID ${tipoRespostaId} não encontrado`,
      );
    }

    if (tipoRespostaId === this.tipoRespostaCorretaId) {
      const respostaCorretaExists = await this.dataSource.query(
        `
        SELECT ID
        FROM FK2_RESPOSTAS
        WHERE PERGUNTA_ID = :1
          AND TIPO_RESPOSTA_ID = :2
        FETCH FIRST 1 ROWS ONLY
        `,
        [perguntaId, this.tipoRespostaCorretaId],
      );

      if (respostaCorretaExists?.length > 0) {
        throw new BadRequestException(
          'Esta pergunta já possui uma resposta correta',
        );
      }
    }

    const query = `
      INSERT INTO FK2_RESPOSTAS (
        DESCRICAO,
        TIPO_RESPOSTA_ID,
        PERGUNTA_ID,
        CREATED_AT
      ) VALUES (
        :1,
        :2,
        :3,
        SYSDATE
      )
    `;

    await this.dataSource.query(query, [descricao, tipoRespostaId, perguntaId]);

    return {
      message: 'Resposta criada com sucesso',
    };
  }

  async updateResposta(id: number, updateRespostaDto: UpdateRespostaDto) {
    const { descricao, tipoRespostaId, perguntaId } = updateRespostaDto;

    const respostaExists = await this.dataSource.query(
      `SELECT ID, PERGUNTA_ID FROM FK2_RESPOSTAS WHERE ID = :1`,
      [id],
    );

    if (!respostaExists || respostaExists.length === 0) {
      throw new NotFoundException(`Resposta com ID ${id} não encontrada`);
    }

    if (perguntaId) {
      const perguntaExists = await this.dataSource.query(
        `SELECT ID FROM FK2_PERGUNTAS WHERE ID = :1`,
        [perguntaId],
      );

      if (!perguntaExists || perguntaExists.length === 0) {
        throw new NotFoundException(
          `Pergunta com ID ${perguntaId} não encontrada`,
        );
      }
    }

    if (tipoRespostaId) {
      const tipoRespostaExists = await this.dataSource.query(
        `SELECT CODIGO FROM FK2_TB_TIPO_RESPOSTA WHERE CODIGO = :1`,
        [tipoRespostaId],
      );

      if (!tipoRespostaExists || tipoRespostaExists.length === 0) {
        throw new BadRequestException(
          `Tipo de resposta com ID ${tipoRespostaId} não encontrado`,
        );
      }
    }

    const perguntaIdParaValidar =
      perguntaId ?? Number(respostaExists[0].PERGUNTA_ID);

    if (tipoRespostaId === this.tipoRespostaCorretaId) {
      const outraRespostaCorreta = await this.dataSource.query(
        `
        SELECT ID
        FROM FK2_RESPOSTAS
        WHERE PERGUNTA_ID = :1
          AND TIPO_RESPOSTA_ID = :2
          AND ID <> :3
        FETCH FIRST 1 ROWS ONLY
        `,
        [perguntaIdParaValidar, this.tipoRespostaCorretaId, id],
      );

      if (outraRespostaCorreta?.length > 0) {
        throw new BadRequestException(
          'Esta pergunta já possui uma resposta correta',
        );
      }
    }

    const updates: string[] = [];
    const parameters: any[] = [];
    let paramIndex = 1;

    if (descricao !== undefined) {
      updates.push(`DESCRICAO = :${paramIndex}`);
      parameters.push(descricao);
      paramIndex++;
    }

    if (tipoRespostaId !== undefined) {
      updates.push(`TIPO_RESPOSTA_ID = :${paramIndex}`);
      parameters.push(tipoRespostaId);
      paramIndex++;
    }

    if (perguntaId !== undefined) {
      updates.push(`PERGUNTA_ID = :${paramIndex}`);
      parameters.push(perguntaId);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new BadRequestException(
        'Nenhum campo para atualizar foi fornecido',
      );
    }

    updates.push(`UPDATED_AT = SYSDATE`);

    const query = `
      UPDATE FK2_RESPOSTAS
      SET ${updates.join(', ')}
      WHERE ID = :${paramIndex}
    `;

    parameters.push(id);

    await this.dataSource.query(query, parameters);

    return {
      message: 'Resposta atualizada com sucesso',
    };
  }

  async removeResposta(id: number) {
    const respostaExists = await this.dataSource.query(
      `SELECT ID FROM FK2_RESPOSTAS WHERE ID = :1`,
      [id],
    );

    if (!respostaExists || respostaExists.length === 0) {
      throw new NotFoundException(`Resposta com ID ${id} não encontrada`);
    }

    const query = `DELETE FROM FK2_RESPOSTAS WHERE ID = :1`;

    await this.dataSource.query(query, [id]);

    return {
      message: 'Resposta removida com sucesso',
    };
  }

  async findDisciplinas(filtros: FilterDisciplinaDto) {
    const { designacao, id, page = 1, limit = 10 } = filtros;

    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        DESIGNACAO,
        ID
      FROM FK2_DISCIPLINA_ADMISSAO
      WHERE 1=1
    `;

    const parameters: any[] = [];
    let paramIndex = 1;

    if (designacao) {
      query += ` AND UPPER(DESIGNACAO) LIKE :${paramIndex}`;
      parameters.push(`%${designacao.toUpperCase()}%`);
      paramIndex++;
    }

    if (id) {
      query += ` AND ID = :${paramIndex}`;
      parameters.push(id);
      paramIndex++;
    }

    query += ` ORDER BY DESIGNACAO`;

    const countQuery = `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_DISCIPLINA_ADMISSAO
      WHERE 1=1
      ${designacao ? ` AND UPPER(DESIGNACAO) LIKE :1` : ''}
      ${id ? ` AND ID = :${designacao ? 2 : 1}` : ''}
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

  async findTiposPergunta(filtros: FilterTipoPerguntaDto) {
    const { designacao, codigo, page = 1, limit = 10 } = filtros;

    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        DESIGNACAO,
        CODIGO
      FROM FK2_TB_TIPO_PERGUNTA
      WHERE 1=1
    `;

    const parameters: any[] = [];
    let paramIndex = 1;

    if (designacao) {
      query += ` AND UPPER(DESIGNACAO) LIKE :${paramIndex}`;
      parameters.push(`%${designacao.toUpperCase()}%`);
      paramIndex++;
    }

    if (codigo) {
      query += ` AND CODIGO = :${paramIndex}`;
      parameters.push(codigo);
      paramIndex++;
    }

    query += ` ORDER BY DESIGNACAO`;

    const countQuery = `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_TB_TIPO_PERGUNTA
      WHERE 1=1
      ${designacao ? ` AND UPPER(DESIGNACAO) LIKE :1` : ''}
      ${codigo ? ` AND CODIGO = :${designacao ? 2 : 1}` : ''}
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

  async findTiposResposta(filtros: FilterTipoRespostaDto) {
    const { designacao, codigo, page = 1, limit = 10 } = filtros;

    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        DESIGNCAO,
        CODIGO
      FROM FK2_TB_TIPO_RESPOSTA
      WHERE 1=1
    `;

    const parameters: any[] = [];
    let paramIndex = 1;

    if (designacao) {
      query += ` AND UPPER(DESIGNCAO) LIKE :${paramIndex}`;
      parameters.push(`%${designacao.toUpperCase()}%`);
      paramIndex++;
    }

    if (codigo) {
      query += ` AND CODIGO = :${paramIndex}`;
      parameters.push(codigo);
      paramIndex++;
    }

    query += ` ORDER BY DESIGNCAO`;

    const countQuery = `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_TB_TIPO_RESPOSTA
      WHERE 1=1
      ${designacao ? ` AND UPPER(DESIGNCAO) LIKE :1` : ''}
      ${codigo ? ` AND CODIGO = :${designacao ? 2 : 1}` : ''}
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

  async remove(id: number) {
    const perguntaExists = await this.dataSource.query(
      `SELECT ID FROM FK2_PERGUNTAS WHERE ID = :1 AND DELETED_AT IS NULL`,
      [id],
    );

    if (!perguntaExists || perguntaExists.length === 0) {
      throw new NotFoundException(`Pergunta com ID ${id} não encontrada`);
    }

    const query = `
      UPDATE FK2_PERGUNTAS
      SET DELETED_AT = SYSDATE
      WHERE ID = :1
    `;

    await this.dataSource.query(query, [id]);

    return {
      message: 'Pergunta removida com sucesso',
    };
  }
}
