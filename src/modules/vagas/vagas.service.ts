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
import { buildCountQuery, buildDataQuery, buildWhereClause } from './query-builder\'/list-vaga.query-builder';

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
    const {
      page = 1,
      limit = 10,
      tipoCandidaturaId = 1,
    } = filtros;

    const offset = (page - 1) * limit;

    const tableName = this.getTableName(tipoCandidaturaId);

    const { clauses, params } = buildWhereClause(filtros);

    const whereClause =
      clauses.length > 0 ? clauses.join(' AND ') : '1=1';

    const [rows, countResult] = await Promise.all([
      this.dataSource.query(
        buildDataQuery(tableName, whereClause),
        {
          ...params,
          offset,
          limit,
        } as any,
      ),
      this.dataSource.query(
        buildCountQuery(tableName, whereClause),
        params as any,
      ),
    ]);

    const total = Number(countResult[0]?.TOTAL ?? 0);

    return {
      data: toLowerCaseKeys(rows),
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