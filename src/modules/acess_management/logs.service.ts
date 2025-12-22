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
  ): Promise<LogAcessoResponseDto[]> {
    const { utilizadorId, dataInicio, dataFim } = dto;

    // Validação básica das datas
    if (new Date(dataFim) < new Date(dataInicio)) {
      throw new BadRequestException('A data fim não pode ser anterior à data início.');
    }

    // Ajuste das datas: início às 00:00:00 e fim às 23:59:59
    const inicio = `${dataInicio} 00:00:00`;
    const fim = `${dataFim} 23:59:59`;

    // Valor especial 404 = trazer todos os utilizadores
    const utilizadorParam = utilizadorId === 404 || !utilizadorId ? null : utilizadorId;

    const sql = `
      SELECT 
        DESCRICAO,
        FK_ACESSO,
        FK_FUNCIONALIDADE,
        FK_UTILIZADOR_RESPONSAVEL,
        FK_GRUPO_AFETADO,
        FK_OPERACAO_LOG,
        CREATED_AT,
        IP,
        PK_LOG_ACESSO
      FROM CMPDEV.FK2_TB_LOG_ACESSOS_FUNCIONALIDADE
      WHERE (${utilizadorParam} IS NULL 
             OR FK_UTILIZADOR_RESPONSAVEL = :utilizadorId)
        AND CREATED_AT >= TO_DATE(:dataInicio, 'YYYY-MM-DD HH24:MI:SS')
        AND CREATED_AT <= TO_DATE(:dataFim, 'YYYY-MM-DD HH24:MI:SS')
      ORDER BY CREATED_AT DESC
    `;

    const parameters = {
      utilizadorId: utilizadorParam,
      dataInicio: inicio,
      dataFim: fim,
    };

    const result = await this.dataSource.query(sql, [
      parameters.utilizadorId,
      parameters.dataInicio,
      parameters.dataFim,
    ]);

    return result.map((row: any) => new LogAcessoResponseDto(row));
  }
}