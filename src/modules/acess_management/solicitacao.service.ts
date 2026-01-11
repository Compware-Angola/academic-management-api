// src/users/referencias.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FetchEncaminhamentoSolicitacaoDTO } from './dto/fetch-encaminhamento-solicitacao.dto';
import { RejectarEncaminhamentoSolicitacaoDTO } from './dto/rejectar-encaminhamento-solicitacao.dto';

import { AprovarEncaminhamentoSolicitacaoDTO } from './dto/aprovar-encaminhamento-solicitacao.dto';

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

  async getPreInscricaoByMatricula(matriculaId: number): Promise<number> {
    const result = await this.dataSource.query(
      `select p.CODIGO
        from FK2_TB_MATRICULAS m
        inner join FK2_TB_ADMISSAO d on d.codigo =  m.codigo_aluno
        inner join FK2_TB_PREINSCRICAO p on p.codigo = d.PRE_INCRICAO
        where m.codigo = :matriculaId;`,
      [matriculaId],
    );

    if (!result || result.length === 0) {
      throw new Error(`PreInscricao não encontrada`);
    }

    return result[0].CODIGO as number;
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
      // Dados auxiliares
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

  async aprovarEncaminhamento({
    descricao,
    solicitacaoId,
    userId,
  }: AprovarEncaminhamentoSolicitacaoDTO) {
    let facturaId = null;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      //1. Buscar dados auxiliares
      const estudanteId = await this.getSolicitacaoUserId(solicitacaoId);
      const [anoLectivo] = await queryRunner.query(
        `select codigo
       from fk2_tb_ano_lectivo
       where status_ = 1
       order by codigo
       fetch first 1 row only`,
      );

      const [solicitacao] = await queryRunner.query(
        `
      SELECT
        s.codigo_matricula,
        s.codigotiposervico,
        ts.preco,
        ts.sigla
      FROM fk2_tb_solicitacao_uma s
      JOIN fk2_tb_tipo_servicos ts ON ts.codigo = s.codigotiposervico
      WHERE s.id = :solicitacaoId
      `,
        { solicitacaoId } as any,
      );
      if (solicitacao.PRECO > 0) {
        const preInscricaoId = await this.getPreInscricaoByMatricula(
          solicitacao.CODIGO_MATRICULA,
        );
        const factura = {
          DataFactura: new Date().toISOString(),
          polo_id: 1,
          TotalPreco: solicitacao.PRECO,
          codigo_descricao: 101,
          ValorAPagar: solicitacao.PRECO,
          total_incidencia: 0,
          total_retencao: 0,
          CodigoMatricula: solicitacao.CODIGO_MATRICULA,
          codigo_preinscricao: preInscricaoId,
          Desconto: 0,
          totalIVA: 0,
          TotalMulta: 0,
          Descricao: 'Factura da solicitação de recaminhamento.',
          tipo_documento_factura_id: 1,
          canal: 3,
          itens: [
            {
              CodigoProduto: solicitacao.CODIGO_TIPO_SERVICO,
              Quantidade: 2,
              preco: solicitacao.PRECO,
              Total: solicitacao.PRECO,
              valor_pago: 0,
              obs: 'Factura da solicitação de recaminhamento.',
              taxaIva: 0,
              valorIva: 0,
              retencao: 0,
              incidencia: 0,
              valorDesconto: 0,
              descontoProduto: 0,
              multa: 0,
              mesTempId: 0,
              estado: 0,
              valorPago: 0,
              valorATransportar: 0,
            },
          ],
        };

        //   const factura = await queryRunner.query(
        //     `
        //       INSERT INTO fk2_factura (
        //         datafactura,
        //         totalpreco,
        //         codigomatricula,
        //         estado,
        //         corrente,
        //         ano_lectivo,
        //         valorapagar,
        //         desconto,
        //         troco,
        //         totaliva,
        //         totalmulta,
        //         total_incidencia,
        //         valorentregue,
        //         valorentreguemltcx,
        //         polo_id,
        //         canal
        //       ) VALUES (
        //           SYSDATE,
        //           :preco,
        //           :codigoMatricula,
        //           0,
        //           1,
        //           :anoLectivo,
        //           :valorPagar,
        //           0,
        //           0,
        //           0,
        //           0,
        //           0,
        //           0,
        //           0,
        //           1,
        //           1
        //       ) RETURNING CODIGO INTO :id
        //         `,
        //     {
        //       preco: solicitacao.PRECO,
        //       valorPagar: solicitacao.PRECO,
        //       codigoMatricula: solicitacao.CODIGO_MATRICULA,
        //       anoLectivo: anoLectivo.CODIGO,
        //       id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        //     } as any,
        //   );
        //   facturaId = factura.id[0];
        //   console.log(facturaId, 'facturas');

        //   //3. Itens da fatura
        //   await queryRunner.query(
        //     `
        //   INSERT INTO fk2_factura_items (
        //     codigo_factura,
        //     codigo_produto,
        //     quantidade,
        //     preco,
        //     total,
        //     estado,
        //     codigo_ano_lectivo,
        //     descontoproduto,
        //     multa,
        //     valor_iva,
        //     valor_pago,
        //     valor_a_transportar
        //   ) VALUES (
        //     :facturaId,
        //     :codigoProduto,
        //     1,
        //     :preco,
        //     :preco,
        //     0,
        //     :anoLectivo,
        //     0,
        //     0,
        //     0,
        //     0,
        //     0
        //   )
        // `,
        //     {
        //       facturaId,
        //       codigoProduto: solicitacao.CODIGO_TIPO_SERVICO,
        //       preco: solicitacao.PRECO,
        //       anoLectivo: anoLectivo.CODIGO,
        //     } as any,
        //   );
      }
      //Caso tiver sigla
      else if (solicitacao.SIGLA == 'AdS') {
        const [preinscricao] = await queryRunner.query(
          `
          SELECT codigo, saldo, saldo_reset
          FROM fk2_tb_preinscricao
          WHERE user_id = :estudanteId
          `,
          { estudanteId } as any,
        );
        if (preinscricao) {
          const novoSaldo =
            Number(preinscricao.SALDO) + Number(preinscricao.SALDO_RESET);
          await queryRunner.query(
            `
          UPDATE fk2_tb_preinscricao
          SET
            saldo = :novoSaldo,
            saldo_reset = 0
          WHERE codigo = :id
          `,
            {
              novoSaldo,
              id: preinscricao.CODIGO,
            } as any,
          );
        }
      }
      //Reposta ao utilizador
      await queryRunner.query(
        `
      INSERT INTO fk2_resposta_solicitacao (
        descricao,
        data_resposta,
        assunto_id,
        user_id2,
        ref_utilizador
      ) VALUES (
        :descricao,
        SYSDATE,
        :solicitacaoId,
        :estudanteId,
        :userId
      )
      `,
        {
          descricao,
          solicitacaoId,
          estudanteId,
          userId,
        } as any,
      );
      //Actualizar os status do sistema
      await queryRunner.query(
        `
      UPDATE fk2_tb_solicitacao_uma
      SET
        status_ = 'Solicitações Respondidas',
        status_aprovacao_servico = 'Solicitação Aprovada',
        codigo_fatura = :facturaId
      WHERE id = :solicitacaoId
      `,
        {
          facturaId,
          solicitacaoId,
        } as any,
      );
      // 🔹 6. Resposta admin (Mutue)
      await queryRunner.query(
        `
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
      `,
        {
          descricao,
          solicitacaoId,
          userId,
        } as any,
      );
      await queryRunner.commitTransaction();
      return {
        success: true,
        message: 'Solicitação aprovada e ',
        facturaId,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
