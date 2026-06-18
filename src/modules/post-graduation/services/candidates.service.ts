import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FindCandidatesDto } from '../dto/candidates.dto';
import { PaginatedResult } from '../types/query.builder';
import { buildCountQuery, buildDataQuery, buildOrderClause, buildWhereClause } from '../query-builder/candidates.query-builder';
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
}