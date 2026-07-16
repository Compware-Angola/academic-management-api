// src/logs/logs.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FilterLogsAcessoDto } from './dto/filter-logs-acesso.dto';
import { LogAcessoResponseDto } from './dto/log-acesso-response.dto';
import { CreateLogsDTO } from './dto/create-logs.dto';

@Injectable()
export class LogsService {
  constructor(private readonly dataSource: DataSource) {}

  async findAllByUtilizadorAndDatas(dto: FilterLogsAcessoDto): Promise<{
    data: LogAcessoResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      utilizadorId,
      dataInicio, // pode ser undefined ou string vazia
      dataFim, // pode ser undefined ou string vazia
      page = 1,
      limit = 25,
      search,
    } = dto;

    // Validação apenas se as datas forem fornecidas
    if (dataInicio && dataFim) {
      if (new Date(dataFim) < new Date(dataInicio)) {
        throw new BadRequestException(
          'A data fim não pode ser anterior à data início.',
        );
      }
    }

    const inicio = dataInicio ? `${dataInicio} 00:00:00` : null;
    const fim = dataFim ? `${dataFim} 23:59:59` : null;

    const offset = (page - 1) * limit;
    const startRow = offset + 1;
    const endRow = offset + limit;

    const utilizadorParam =
      utilizadorId === 404 || !utilizadorId ? null : utilizadorId;

    const params: any = {
      utilizadorId: utilizadorParam,
      startRow,
      endRow,
    };

    // Só adiciona params de data se foram fornecidos
    if (inicio && fim) {
      params.dataInicio = inicio;
      params.dataFim = fim;
    }

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
          lga.IP,
          u.NOME               AS NOME_UTILIZADOR_RESPONSAVEL,
          u.PK_UTILIZADOR      AS CODIGO_UTILIZADOR,
          f.DESIGNACAO         AS NOME_FUNCIONALIDADE,
          a.DESIGNACAO         AS DESIGNACAO_ACESSO
        FROM FK2_TB_LOG_ACESSOS_FUNCIONALIDADE lga
        LEFT JOIN FK2_MCA_TB_UTILIZADOR u
               ON u.PK_UTILIZADOR = lga.FK_UTILIZADOR_RESPONSAVEL
        LEFT JOIN FK2_MCA_TB_FUNCIONALIDADE f
               ON f.PK_FUNCIONALIDADE = lga.FK_FUNCIONALIDADE
        LEFT JOIN FK2_MCA_TB_ACESSO a
               ON a.PK_ACESSO = lga.FK_ACESSO
        WHERE 1=1
          AND (:utilizadorId IS NULL OR lga.FK_UTILIZADOR_RESPONSAVEL = :utilizadorId)
  `;

    // Filtro de data apenas se os parâmetros existirem
    if (inicio && fim) {
      sql += `
          AND lga.CREATED_AT BETWEEN 
              TO_DATE(:dataInicio, 'YYYY-MM-DD HH24:MI:SS')
          AND TO_DATE(:dataFim, 'YYYY-MM-DD HH24:MI:SS')
    `;
    }

    // Filtro de pesquisa (opcional)
    if (search && search.trim()) {
      const searchParam = `%${search.trim().toUpperCase()}%`;
      params.search = searchParam;

      sql += `
          AND (
            UPPER(lga.DESCRICAO) LIKE :search
            OR UPPER(lga.IP) LIKE :search
            OR UPPER(u.NOME) LIKE :search
            OR UPPER(u.USERNAME) LIKE :search
            OR UPPER(f.DESIGNACAO) LIKE :search
          )
    `;
    }

    sql += `
        ) dados
      ) paginado
      WHERE paginado.rn BETWEEN :startRow AND :endRow
  `;

    const result = await this.dataSource.query(sql, params);

    const total = result.length > 0 ? Number(result[0].TOTAL_REGISTROS) : 0;

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
  async create(dto: CreateLogsDTO) {
    await this.dataSource.query(
      `
    INSERT INTO FK2_TB_LOG_ACESSOS_FUNCIONALIDADE 
    (
      DESCRICAO,
      FK_ACESSO,
      FK_FUNCIONALIDADE,
      FK_UTILIZADOR_RESPONSAVEL,
      FK_GRUPO_AFETADO,
      FK_OPERACAO_LOG,
      CREATED_AT,
      IP
      -- PK_LOG_ACESSO normalmente é gerada automaticamente (IDENTITY ou SEQUENCE)
    )
    VALUES 
    (
      :descricao,
      :fkAcesso,
      :fkFuncionalidade,
      :fkUtilizadorResponsavel,
      :fkGrupoAfetado,
      :fkOperacaoLog,
      SYSDATE,           -- ou :createdAt se vier do DTO
      :ip
    )
    `,
      {
        descricao: dto.descricao,
        fkAcesso: dto.fkAcesso,
        fkFuncionalidade: dto.fkFuncionalidade,
        fkUtilizadorResponsavel: dto.fkUtilizadorResponsavel,
        fkGrupoAfetado: dto.fkGrupoAfetado || null,
        fkOperacaoLog: dto.fkOperacaoLog,
        ip: dto.ip,
      } as any,
    );
    return {
      success: true,
      message: ' Created !',
    };
  }
}
