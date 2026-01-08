// src/users/referencias.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FetchEncaminhamentoSolicitacaoDTO } from './dto/fetch-encaminhamento-solicitacao.dto';
import { RejectarEncaminhamentoSolicitacaoDTO } from './dto/rejectar-encaminhamento-solicitacao.dto';
import { escapeQuotes } from '../util/escape-quotes';

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

  async getSolicitacaoUserId(solicitacaoId: number): Promise<number> {
    const result = await this.dataSource.query(
      `select USER_ID from fk2_tb_solicitacao_uma where id = :solicitacaoId `,
      [solicitacaoId],
    );
    if (!result || result.length == 0) {
      throw new Error(`Nenhuma solicitação encontrada ${solicitacaoId}`);
    }
    return result[0].USER_ID as number;
  }

  async getNomeUser(userId: number): Promise<string> {
    const result = await this.dataSource.query(
      `select NOME from FK2_MCA_TB_UTILIZADOR where PK_UTILIZADOR = :userId`,
      [userId],
    );

    if (!result || result.length === 0) {
      throw new Error(`Docente não encontrado para o código ${userId}`);
    }

    return result[0].NOME as string;
  }

  async rejeitarEncaminhamento({
    solicitacaoId,
    userId,
    descricao,
  }: RejectarEncaminhamentoSolicitacaoDTO) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 🔹 Dados auxiliares
      const estudanteId = await this.getSolicitacaoUserId(solicitacaoId);

      const sqlSolicitacao = `
      UPDATE fk2_tb_solicitacao_uma
      SET
        status_ = 'Solicitações Respondidas',
        status_aprovacao_servico = 'Solicitação Reprovada'
      WHERE id = :solicitacaoId
    `;

      await queryRunner.query(sqlSolicitacao, { solicitacaoId } as any);

      // 🔹 2. Inserir resposta da solicitação
      const sqlResposta = `
      INSERT INTO fk2_resposta_solicitacao (
        descricao,
        data_resposta,
        user_id1,
        assunto_id,
        user_id2,
        ref_utilizador
      ) VALUES (
        :descricao,
        SYSDATE,
        NULL,
        :solicitacaoId,
        :userId,
        :userRef
      )
    `;

      await queryRunner.query(sqlResposta, {
        descricao,
        solicitacaoId,
        userId: estudanteId,
        userRef: userId,
      } as any);

      const sqlMutueAdmin = `
      INSERT INTO fk2_tb_resposta_solicitacao_admin (
        descricao,
        codigo_solicitacao,
        codigo_utilizador,
        data
        ) VALUES (
        :descricao,
        :solicitacaoId,
        :userId,
        SYSDATE
      )
    `;

      await queryRunner.query(sqlMutueAdmin, {
        descricao,
        solicitacaoId,
        userId,
      } as any);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Encaminhamento rejeitado com sucesso',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
