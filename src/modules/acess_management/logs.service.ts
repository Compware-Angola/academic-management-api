// src/logs/logs.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FilterLogsAcessoDto } from './dto/filter-logs-acesso.dto';
import { LogAcessoResponseDto } from './dto/log-acesso-response.dto';

@Injectable()
export class LogsService {
  constructor(private readonly dataSource: DataSource) {}

async findAllByUtilizadorAndDatas(
  dto: FilterLogsAcessoDto,
): Promise<{
  data: LogAcessoResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const {
    utilizadorId,
    dataInicio,
    dataFim,
    page = 1,
    limit = 25,
    search,
  } = dto;

  if (new Date(dataFim) < new Date(dataInicio)) {
    throw new BadRequestException(
      'A data fim não pode ser anterior à data início.',
    );
  }

  const inicio = `${dataInicio} 00:00:00`;
  const fim = `${dataFim} 23:59:59`;

  const offset = (page - 1) * limit;

  const utilizadorParam =
    utilizadorId === 404 || !utilizadorId ? null : utilizadorId;

  const params: any = {
    utilizadorId: utilizadorParam,
    dataInicio: inicio,
    dataFim: fim,
    offset,
    limit: offset + limit,
  };

  let sql = `
SELECT *
FROM (
  SELECT
    dados.*,
    ROW_NUMBER() OVER (ORDER BY dados.CREATED_AT DESC) AS rn,
    COUNT(*) OVER () AS total_registros
  FROM (
    SELECT
      lga.PK_LOG_ACESSO,
      lga.DESCRICAO,
      lga.FK_ACESSO,
      lga.FK_FUNCIONALIDADE,
      lga.FK_UTILIZADOR_RESPONSAVEL,
      lga.FK_GRUPO_AFETADO,
      lga.FK_OPERACAO_LOG,
      lga.CREATED_AT,
      lga.IP
    FROM FK2_TB_LOG_ACESSOS_FUNCIONALIDADE lga
 
    WHERE (:utilizadorId IS NULL
           OR lga.FK_UTILIZADOR_RESPONSAVEL = :utilizadorId)
      AND lga.CREATED_AT >= TO_DATE(:dataInicio, 'YYYY-MM-DD HH24:MI:SS')
      AND lga.CREATED_AT <= TO_DATE(:dataFim, 'YYYY-MM-DD HH24:MI:SS')
  `;

  // 🔍 filtro search ENTRA AQUI
  if (search && search.trim()) {
    params.search = `%${search.trim().toUpperCase()}%`;
    sql += `
      AND (
        UPPER(lga.DESCRICAO) LIKE :search
        OR lga.IP LIKE :search
      )
    `;
  }

  // 🔒 fechar query APENAS UMA VEZ
  sql += `
    ) dados
  )
  WHERE rn > :offset
    AND rn <= :limit
  ORDER BY rn
  `;

  const result = await this.dataSource.query(sql, params);

  const total =
    result.length > 0 ? Number(result[0].TOTAL_REGISTROS) : 0;

  const data = result.map((row: any) => {
    const { RN, TOTAL_REGISTROS, ...rest } = row;
    return new LogAcessoResponseDto(rest);
  });

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}


}