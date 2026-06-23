import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FindCandidatesDto } from '../dto/candidates.dto';
import { PaginatedResult } from '../types/query.builder';
import { buildCandidateDocumentsQuery, buildCountQuery, buildDataQuery, buildOrderClause, buildWhereClause } from '../query-builder/candidates.query-builder';
import { toLowerCaseKeys } from 'src/modules/util/toLowerCaseKeys';



@Injectable()
export class CandidatesService {
  constructor(private readonly dataSource: DataSource) {}
  async findCandidates(
    filters: FindCandidatesDto,
  ): Promise<PaginatedResult<any>> {
    const { limit = 10, page = 1, sortBy, sortOrder } = filters;
    const offset = (page - 1) * limit;

    const { clauses, params } = buildWhereClause(filters);
    const whereClause = clauses.length > 0 ? clauses.join(' AND ') : '1=1';
    const orderClause = buildOrderClause(sortBy, sortOrder);

    const [rows, countResult] = await Promise.all([
      this.dataSource.query(buildDataQuery(whereClause, orderClause), {
        ...params,
        offset,
        limit,
      } as any),
      this.dataSource.query(buildCountQuery(whereClause), params as any),
    ]);

    const total = Number(countResult[0]?.TOTAL ?? 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data: toLowerCaseKeys(rows),
      total,
      page,
      limit,
      totalPages,
    };
  }
  async findCandidateDocuments(
    id: number,
  ): Promise<PaginatedResult<any>> {
    const rows = await this.dataSource.query(buildCandidateDocumentsQuery(), {
      id,
    } as any);
    return toLowerCaseKeys(rows);
  }

   async reject(candidateId: number, reason: string) {
    const candidate = await this.dataSource.query(
      `
      SELECT CODIGO
      FROM FK2_TB_PREINSCRICAO
      WHERE CODIGO = :candidateId
      `,
      { candidateId } as any,
    );

    if (!candidate.length) {
      throw new NotFoundException('Candidato não encontrado');
    }

    await this.dataSource.transaction(async (manager) => {

      await manager.query(
        `
        DELETE FROM FK2_TB_REJEICAO_CANDIDATURA_ALUNO
        WHERE FK_PREINSCRICAO = :candidateId
        `,
        { candidateId } as any,
      );

      await manager.query(
        `
        INSERT INTO FK2_TB_REJEICAO_CANDIDATURA_ALUNO (
          FK_PREINSCRICAO,
          MOTIVO
        )
        VALUES (
          :candidateId,
          :reason
        )
        `,
        {
          candidateId,
          reason,
        } as any,
      );
    });

    return {
      success: true,
      message: 'Candidato rejeitado com sucesso',
    };
  }
}