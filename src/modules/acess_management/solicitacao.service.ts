// src/users/referencias.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FetchEncaminhamentoSolicitacaoDTO } from './dto/fetch-encaminhamento-solicitacao.dto';

@Injectable()
export class SolicitacaoService {
  constructor(private readonly dataSource: DataSource) {}
  async findEncaminhamentos({
    serviceId,
    estado,
    limit = 25,
    page = 1,
  }: FetchEncaminhamentoSolicitacaoDTO) {
    const offset = (page - 1) * limit;
    const whereConditions: string[] = [];
    const params: any = {};

    if (serviceId !== undefined) {
      whereConditions.push('SU.CODIGOTIPOSERVICO = :serviceId');
      params.serviceId = serviceId;
    }
    if (estado !== undefined) {
      whereConditions.push('SU.STATUS_ = :estado');
      params.estado = estado;
    }

    const whereClause =
      whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

    const sql = `
      SELECT
        EN.CODIGO,
        SU.ARQUIVO,
        EN.ESTADO_ENCAMINHAMENTO,
        PR.DESIGNACAO               AS PRIORIDADE,
        UT.NOME                     AS NOME_REMETENTE,
        UTREC.NOME                  AS NOME_RECEPTOR,
        SU.CODIGO_MATRICULA         AS CODIGO_MATRICULA,
        SU.DESCRICAO,
        SU.ASSUNTO,
        SU.DATA_SOLICITACAO,
        SU.DESTINO,
        UR.NAME                     AS NOME,
        SER.DESCRICAO               AS DESCRICAO_SERVICO,
        C.DESIGNACAO                AS CURSO,
        SU.STATUS_APROVACAO_SERVICO AS ESTADO_APROVACAO,
        SU.STATUS_                  AS ESTADO
      FROM FK2_MC_TB_ENCAMINHAMENTO_SOLICITACAO EN
        LEFT JOIN FK2_TB_PRIORIDADE PR
          ON PR.CODIGO = EN.CODIGO_PRIORIDADE
        LEFT JOIN FK2_MCA_TB_UTILIZADOR UT
          ON UT.PK_UTILIZADOR = EN.CODIGO_REMETENTE
        LEFT JOIN FK2_MCA_TB_UTILIZADOR UTREC
          ON UTREC.PK_UTILIZADOR = EN.CODIGO_RECEPTOR
        INNER JOIN FK2_TB_SOLICITACAO_UMA SU
          ON SU.ID = EN.CODIGO_SOLICITACAO
        LEFT JOIN FK2_USERS UR
          ON UR.ID = SU.USER_ID
        LEFT JOIN FK2_TB_MATRICULAS M
          ON M.CODIGO = SU.CODIGO_MATRICULA
        LEFT JOIN FK2_TB_CURSOS C
          ON C.CODIGO = M.CODIGO_CURSO
        LEFT JOIN FK2_TB_TIPO_SERVICOS SER
          ON SER.CODIGO = SU.CODIGOTIPOSERVICO
       ${whereClause}
      ORDER BY SU.DATA_SOLICITACAO DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;

    const sqlCount = `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_MC_TB_ENCAMINHAMENTO_SOLICITACAO EN
        INNER JOIN FK2_TB_SOLICITACAO_UMA SU
          ON SU.ID = EN.CODIGO_SOLICITACAO
       ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql, params),
      this.dataSource.query(sqlCount, params),
    ]);

    const total = Number(countResult[0].TOTAL);
    const totalPages = Math.ceil(total / limit);

    return {
      data: await toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages,
    };
  }
}
