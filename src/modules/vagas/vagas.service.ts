import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FilterVagasDto } from './dto/filter-vagas.dto';
import { CreateVagaDto } from './dto/create-vaga.dto';
import { UpdateVagaDto } from './dto/update-vaga.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

@Injectable()
export class VagasService {
  constructor(private readonly dataSource: DataSource) { }

  private getTableName(tipoCandidaturaId: number): string {
    switch (tipoCandidaturaId) {
      case 1:
        return 'FK2_VAGAS_CURSOS';
      case 2:
        return 'FK2_VAGAS_CURSOS_POS_GRADUACAO';
      case 3:
        return 'FK2_VAGAS_CURSOS_POS_GRADUACAO';
      default:
        throw new BadRequestException(`Tipo de candidatura com ID ${tipoCandidaturaId} não encontrado`);
    }
  }

  async findAll(filtros: FilterVagasDto) {
    const { cursoId, periodoId, anoLetivoId, page = 1, limit = 10, tipoCandidaturaId = 1 } = filtros;

    const offset = (page - 1) * limit;

    const mainTable = this.getTableName(tipoCandidaturaId);

    let query = `
      SELECT V.ID,
             V.CURSO_ID,
             C.DESIGNACAO CURSO,
             V.CURSOSOPCIONAIS,
             V.PERIODO_ID,
             P.DESIGNACAO PERIODO,
             V.ANO_LECTIVO_ID,
             A.DESIGNACAO ANO_LECTIVO,
             V.NUM_VAGAS,
             V.NUM_VAGAS - (SELECT COUNT(DISTINCT tbc.Codigo_Matricula)
                           FROM fk2_tb_confirmacoes tbc
                           JOIN fk2_tb_matriculas tbm ON tbc.Codigo_Matricula = tbm.Codigo
                           JOIN fk2_tb_admissao ta ON tbm.Codigo_Aluno = ta.codigo
                           JOIN fk2_tb_preinscricao tpri ON ta.pre_incricao = tpri.Codigo
                           WHERE tpri.Curso_Candidatura = v.curso_id
                             AND tpri.Codigo_Turno = v.periodo_id
                             AND tpri.anoLectivo = v.ano_lectivo_id
                          ) AS VAGAS_DISPONIVEIS,
             V.CREATED_AT,
             V.UPDATED_AT
      FROM ${mainTable} V,
           FK2_TB_CURSOS C,
           FK2_TB_PERIODOS P,
           FK2_TB_ANO_LECTIVO A
      WHERE 1=1
        AND V.CURSO_ID = C.CODIGO
        AND V.PERIODO_ID = P.CODIGO
        AND V.ANO_LECTIVO_ID = A.CODIGO
    `;

    const parameters: any[] = [];
    let paramIndex = 1;

    if (cursoId) {
      query += ` AND V.CURSO_ID = :${paramIndex}`;
      parameters.push(cursoId);
      paramIndex++;
    }

    if (periodoId) {
      query += ` AND V.PERIODO_ID = :${paramIndex}`;
      parameters.push(periodoId);
      paramIndex++;
    }

    if (anoLetivoId) {
      query += ` AND V.ANO_LECTIVO_ID = :${paramIndex}`;
      parameters.push(anoLetivoId);
      paramIndex++;
    }


    query += ` ORDER BY V.CREATED_AT DESC`;

    const countQuery = `
      SELECT COUNT(*) AS TOTAL
      FROM ${mainTable} V,
           FK2_TB_CURSOS C,
           FK2_TB_PERIODOS P,
           FK2_TB_ANO_LECTIVO A
      WHERE 1=1
        AND V.CURSO_ID = C.CODIGO
        AND V.PERIODO_ID = P.CODIGO
        AND V.ANO_LECTIVO_ID = A.CODIGO
        
      ${cursoId ? ` AND V.CURSO_ID = :1` : ''}
      ${periodoId ? ` AND V.PERIODO_ID = :${cursoId ? 2 : 1}` : ''}
      ${anoLetivoId ? ` AND V.ANO_LECTIVO_ID = :${cursoId && periodoId ? 3 : cursoId || periodoId ? 2 : 1}` : ''}
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

  async create(createVagaDto: CreateVagaDto) {
    const { cursoId, cursosOpcionais, periodoId, anoLetivoId, numVagas, tipoCandidaturaId } =
      createVagaDto;

    const cursoExists = await this.dataSource.query(
      `SELECT CODIGO FROM FK2_TB_CURSOS WHERE CODIGO = :1`,
      [cursoId],
    );

    if (!cursoExists || cursoExists.length === 0) {
      throw new NotFoundException(`Curso com ID ${cursoId} não encontrado`);
    }

    const periodoExists = await this.dataSource.query(
      `SELECT CODIGO FROM FK2_TB_PERIODOS WHERE CODIGO = :1`,
      [periodoId],
    );

    if (!periodoExists || periodoExists.length === 0) {
      throw new NotFoundException(
        `Período com ID ${periodoId} não encontrado`,
      );
    }

    const anoLetivoExists = await this.dataSource.query(
      `SELECT CODIGO FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :1`,
      [anoLetivoId],
    );

    if (!anoLetivoExists || anoLetivoExists.length === 0) {
      throw new NotFoundException(
        `Ano letivo com ID ${anoLetivoId} não encontrado`,
      );
    }

    const tipoCandidaturaExists = await this.dataSource.query(
      `SELECT CODIGO FROM  WHERE CODIGO = :1`,
      [tipoCandidaturaId],
    );

    if (!tipoCandidaturaExists || tipoCandidaturaExists.length === 0) {
      throw new NotFoundException(
        `Tipo de candidatura com ID ${tipoCandidaturaId} não encontrado`,
      );
    }
    const mainTable = this.getTableName(tipoCandidaturaId);
    const vagaExists = await this.dataSource.query(
      `SELECT ID FROM ${mainTable} 
       WHERE CURSO_ID = :1 
         AND PERIODO_ID = :2 
         AND ANO_LECTIVO_ID = :3`,
      [cursoId, periodoId, anoLetivoId],
    );

    if (vagaExists && vagaExists.length > 0) {
      throw new BadRequestException(
        'Já existe uma vaga cadastrada para este curso, período e ano letivo',
      );
    }

    const query = `
      INSERT INTO ${mainTable} (
        CURSO_ID,
        CURSOSOPCIONAIS,
        PERIODO_ID,
        ANO_LECTIVO_ID,
        NUM_VAGAS,
        CREATED_AT
      ) VALUES (
        :1,
        :2,
        :3,
        :4,
        :5,
        SYSDATE
      )
    `;

    await this.dataSource.query(query, [
      cursoId,
      cursosOpcionais || null,
      periodoId,
      anoLetivoId,
      numVagas,
    ]);

    return {
      message: 'Vaga criada com sucesso',
    };
  }

  async update(id: number, updateVagaDto: UpdateVagaDto) {
    const { cursoId, cursosOpcionais, periodoId, anoLetivoId, numVagas } =
      updateVagaDto;

    const vagaExists = await this.dataSource.query(
      `SELECT ID FROM FK2_VAGAS_CURSOS WHERE ID = :1`,
      [id],
    );

    if (!vagaExists || vagaExists.length === 0) {
      throw new NotFoundException(`Vaga com ID ${id} não encontrada`);
    }

    if (cursoId) {
      const cursoExists = await this.dataSource.query(
        `SELECT CODIGO FROM FK2_TB_CURSOS WHERE CODIGO = :1`,
        [cursoId],
      );

      if (!cursoExists || cursoExists.length === 0) {
        throw new NotFoundException(`Curso com ID ${cursoId} não encontrado`);
      }
    }

    if (periodoId) {
      const periodoExists = await this.dataSource.query(
        `SELECT CODIGO FROM FK2_TB_PERIODOS WHERE CODIGO = :1`,
        [periodoId],
      );

      if (!periodoExists || periodoExists.length === 0) {
        throw new NotFoundException(
          `Período com ID ${periodoId} não encontrado`,
        );
      }
    }

    if (anoLetivoId) {
      const anoLetivoExists = await this.dataSource.query(
        `SELECT CODIGO FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :1`,
        [anoLetivoId],
      );

      if (!anoLetivoExists || anoLetivoExists.length === 0) {
        throw new NotFoundException(
          `Ano letivo com ID ${anoLetivoId} não encontrado`,
        );
      }
    }

    const updates: string[] = [];
    const parameters: any[] = [];
    let paramIndex = 1;

    if (cursoId !== undefined) {
      updates.push(`CURSO_ID = :${paramIndex}`);
      parameters.push(cursoId);
      paramIndex++;
    }

    if (cursosOpcionais !== undefined) {
      updates.push(`CURSOSOPCIONAIS = :${paramIndex}`);
      parameters.push(cursosOpcionais);
      paramIndex++;
    }

    if (periodoId !== undefined) {
      updates.push(`PERIODO_ID = :${paramIndex}`);
      parameters.push(periodoId);
      paramIndex++;
    }

    if (anoLetivoId !== undefined) {
      updates.push(`ANO_LECTIVO_ID = :${paramIndex}`);
      parameters.push(anoLetivoId);
      paramIndex++;
    }

    if (numVagas !== undefined) {
      updates.push(`NUM_VAGAS = :${paramIndex}`);
      parameters.push(numVagas);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new BadRequestException(
        'Nenhum campo para atualizar foi fornecido',
      );
    }

    updates.push(`UPDATED_AT = SYSDATE`);

    const query = `
      UPDATE FK2_VAGAS_CURSOS
      SET ${updates.join(', ')}
      WHERE ID = :${paramIndex}
    `;

    parameters.push(id);

    await this.dataSource.query(query, parameters);

    return {
      message: 'Vaga atualizada com sucesso',
    };
  }

  async remove(id: number) {
    const vagaExists = await this.dataSource.query(
      `SELECT ID FROM FK2_VAGAS_CURSOS WHERE ID = :1`,
      [id],
    );

    if (!vagaExists || vagaExists.length === 0) {
      throw new NotFoundException(`Vaga com ID ${id} não encontrada`);
    }

    const query = `DELETE FROM FK2_VAGAS_CURSOS WHERE ID = :1`;

    await this.dataSource.query(query, [id]);

    return {
      message: 'Vaga removida com sucesso',
    };
  }
}