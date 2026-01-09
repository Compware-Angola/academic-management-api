// src/acessos/acessos.service.ts
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FilterAcessoDto } from './dto/filter-acesso.dto';
import { AcessoResponseDto } from './dto/acesso.response.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import oracledb from 'oracledb';

@Injectable()
export class AcessosService {
  private readonly logger = new Logger(AcessosService.name);

  constructor(private readonly dataSource: DataSource) {}
  async listarAcessosDropDown(
    filter: FilterAcessoDto,
  ): Promise<AcessoResponseDto[]> {
    let whereClause = '';
    const params: any[] = [];

    if (filter.apenasAtivos === 'true') {
      whereClause += ' AND A.ACTIVE_STATE = 1';
    }

    if (filter.utilizadorId) {
      whereClause += `
        AND EXISTS (
          SELECT 1
          FROM FK2_MCA_TB_GRUPO_UTILIZADOR GU
          INNER JOIN FK2_MCA_TB_GRUPO_ACESSO GA ON GU.FK_GRUPO = GA.FK_GRUPO
          WHERE GU.FK_UTILIZADOR = ?
            AND GA.FK_ACESSO = A.PK_ACESSO
            AND GA.ACTIVE_STATE = 1
        )`;
      params.push(filter.utilizadorId);
    }

    if (filter.grupoId) {
      whereClause += `
        AND EXISTS (
          SELECT 1
          FROM FK2_MCA_TB_GRUPO_ACESSO GA
          WHERE GA.FK_GRUPO = ?
            AND GA.FK_ACESSO = A.PK_ACESSO
            AND GA.ACTIVE_STATE = 1
        )`;
      params.push(filter.grupoId);
    }

    const sql = `
      SELECT DISTINCT
        A.PK_ACESSO,
        A.DESIGNACAO,
        A.SIGLA,
        M.PK_MODULO AS MODULOID,
        M.DESIGNACAO AS MODULONOME,
        TA.DESIGNACAO AS TIPOACESSO,
        A.ACTIVE_STATE AS ATIVO,
        A.ACTIVE_DATE AS DATAATIVACAO
      FROM FK2_MCA_TB_ACESSO A
      LEFT JOIN FK2_MCA_TB_MODULO M ON A.FK_MODULO = M.PK_MODULO
      LEFT JOIN FK2_MCA_TB_TIPO_ACESSO TA ON A.FK_TIPO_ACESSO = TA.PK_TIPO_ACESSO
      WHERE 1=1 ${whereClause}
      ORDER BY A.DESIGNACAO ASC
    `;

    try {
      const result = await this.dataSource.query(sql, params);
      return result.map((row) => new AcessoResponseDto(row));
    } catch (error) {
      this.logger.error('Erro ao listar acessos', error);
      throw new InternalServerErrorException('Falha ao listar acessos');
    }
  }

  async listarAcessos(filter: FilterAcessoDto) {
    let whereClause = '';
    const params: any[] = [];
    const page = Number(filter.page ?? 1);
    const limit = Number(filter.limit ?? 25);
    const offset = (page - 1) * limit;

    if (filter.apenasAtivos === 'true') {
      whereClause += ' AND A.ACTIVE_STATE = 1';
    }

    if (filter.utilizadorId) {
      whereClause += `
        AND EXISTS (
          SELECT 1
          FROM FK2_MCA_TB_GRUPO_UTILIZADOR GU
          INNER JOIN FK2_MCA_TB_GRUPO_ACESSO GA ON GU.FK_GRUPO = GA.FK_GRUPO
          WHERE GU.FK_UTILIZADOR = ?
            AND GA.FK_ACESSO = A.PK_ACESSO
            AND GA.ACTIVE_STATE = 1
        )`;
      params.push(filter.utilizadorId);
    }

    if (filter.grupoId) {
      whereClause += `
        AND EXISTS (
          SELECT 1
          FROM FK2_MCA_TB_GRUPO_ACESSO GA
          WHERE GA.FK_GRUPO = ?
            AND GA.FK_ACESSO = A.PK_ACESSO
            AND GA.ACTIVE_STATE = 1
        )`;
      params.push(filter.grupoId);
    }

    const sql = `
      SELECT DISTINCT
        A.PK_ACESSO,
        A.DESIGNACAO,
        A.SIGLA,
        M.PK_MODULO AS MODULOID,
        M.DESIGNACAO AS MODULONOME,
        TA.DESIGNACAO AS TIPOACESSO,
        A.ACTIVE_STATE AS ATIVO,
        A.ACTIVE_DATE AS DATAATIVACAO
      FROM FK2_MCA_TB_ACESSO A
      LEFT JOIN FK2_MCA_TB_MODULO M ON A.FK_MODULO = M.PK_MODULO
      LEFT JOIN FK2_MCA_TB_TIPO_ACESSO TA ON A.FK_TIPO_ACESSO = TA.PK_TIPO_ACESSO
      WHERE 1=1 ${whereClause}
      ORDER BY A.DESIGNACAO ASC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `;
    const sqlCount = `
    SELECT COUNT(DISTINCT A.PK_ACESSO) AS TOTAL
    FROM FK2_MCA_TB_ACESSO A
    WHERE 1 = 1 ${whereClause}
  `;

    try {
      const [result, countResult] = await Promise.all([
        this.dataSource.query(sql, params),
        this.dataSource.query(sqlCount, params),
      ]);

      const total = Number(countResult[0]?.TOTAL ?? 0);
      const totalPages = Math.ceil(total / limit);

      return {
        data: await toLowerCaseKeys(result),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Erro ao listar acessos', error);
      throw new InternalServerErrorException('Falha ao listar acessos');
    }
  }

  async listarPorUtilizador(
    utilizadorId: number,
  ): Promise<AcessoResponseDto[]> {
    const sql = `
      SELECT DISTINCT
        A.PK_ACESSO,
        A.DESIGNACAO,
        A.SIGLA,
        M.PK_MODULO AS MODULOID,
        M.DESIGNACAO AS MODULONOME,
        TA.DESIGNACAO AS TIPOACESSO,
        A.ACTIVE_STATE AS ATIVO,
        A.ACTIVE_DATE AS DATAATIVACAO
      FROM FK2_MCA_TB_ACESSO A
      INNER JOIN FK2_MCA_TB_GRUPO_ACESSO GA ON A.PK_ACESSO = GA.FK_ACESSO
      INNER JOIN FK2_MCA_TB_GRUPO G ON GA.FK_GRUPO = G.PK_GRUPO
      INNER JOIN FK2_MCA_TB_GRUPO_UTILIZADOR GU ON G.PK_GRUPO  = GU.FK_GRUPO
      LEFT JOIN FK2_MCA_TB_MODULO M ON A.FK_MODULO = M.PK_MODULO
      LEFT JOIN FK2_MCA_TB_TIPO_ACESSO TA ON A.FK_TIPO_ACESSO = TA.PK_TIPO_ACESSO
      WHERE GU.FK_UTILIZADOR = ${utilizadorId}
        AND A.ACTIVE_STATE = 1
        AND GA.ACTIVE_STATE = 1
        AND G.ACTIVE_STATE = 1
      ORDER BY A.DESIGNACAO ASC
    `;

    const result = await this.dataSource.query(sql);
    return result.map((row) => new AcessoResponseDto(row));
  }

  async listarPorGrupo(grupoId: number): Promise<AcessoResponseDto[]> {
    const sql = `
      SELECT DISTINCT
        A.PK_ACESSO,
        A.DESIGNACAO,
        A.SIGLA,
        M.PK_MODULO AS MODULOID,
        M.DESIGNACAO AS MODULONOME,
        TA.DESIGNACAO AS TIPOACESSO,
        A.ACTIVE_STATE AS ATIVO,
        A.ACTIVE_DATE AS DATAATIVACAO
      FROM FK2_MCA_TB_ACESSO A
      INNER JOIN FK2_MCA_TB_GRUPO_ACESSO GA ON A.PK_ACESSO = GA.FK_ACESSO
      LEFT JOIN FK2_MCA_TB_MODULO M ON A.FK_MODULO = M.PK_MODULO
      LEFT JOIN FK2_MCA_TB_TIPO_ACESSO TA ON A.FK_TIPO_ACESSO = TA.PK_TIPO_ACESSO
      WHERE GA.FK_GRUPO = ${grupoId}
        AND A.ACTIVE_STATE = 1
        AND GA.ACTIVE_STATE = 1
      ORDER BY A.DESIGNACAO ASC
    `;

    const result = await this.dataSource.query(sql);
    return result.map((row) => new AcessoResponseDto(row));
  }

  async getUsername(userId: number): Promise<string> {
    const result = await this.dataSource.query(
      `select USERNAME from FK2_MCA_TB_UTILIZADOR where PK_UTILIZADOR = :userId`,
      [userId],
    );

    if (!result || result.length === 0) {
      throw new Error(`Utilizador não encontrado ${userId}`);
    }

    return result[0].USERNAME as string;
  }
  async getPkGrupoAcesso(): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT MAX (PK_GRUPO_ACESSO) + 1 AS PK_GRUPO_ACESSO FROM FK2_MCA_TB_GRUPO_ACESSO`,
    );
    console.log(result, 'mensageiro');
    if (!result || result.length === 0) {
      throw new Error(`Erro ao gerar chave`);
    }
    return result[0].PK_GRUPO_ACESSO;
  }

  async adicionarAcesso(
    utilizadorId: number,
    acessoId: number,
    usuarioLogadoId: number,
  ): Promise<{ message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let grupoUnitarioId;
    try {
      // 1. Verifica se o acesso existe
      const [acessoExiste] = await queryRunner.manager.query(
        `SELECT 1 FROM FK2_MCA_TB_ACESSO WHERE PK_ACESSO = :acessoId AND ACTIVE_STATE = 1`,
        [acessoId],
      );
      if (!acessoExiste) {
        throw new NotFoundException('Acesso não encontrado ou inativo');
      }

      // 2. Busca o grupo unitário do utilizador
      const [grupoUnitario] = await queryRunner.manager.query(
        `
        SELECT G.PK_GRUPO
        FROM FK2_MCA_TB_GRUPO G
        INNER JOIN FK2_MCA_TB_GRUPO_UTILIZADOR GU ON G.PK_GRUPO  = GU.FK_GRUPO
        WHERE GU.FK_UTILIZADOR = :utilizadorId
          AND G.FK_TIPO_DE_GRUPO = 2
          AND G.ACTIVE_STATE = 1
        `,
        [utilizadorId],
      );
      const pkGrupoAcesso = await this.getPkGrupoAcesso();

      if (!grupoUnitario) {
        const username = await this.getUsername(utilizadorId);
        const result = await queryRunner.manager.query(
          `
          INSERT INTO FK2_MCA_TB_GRUPO (
            DESIGNACAO, SIGLA, DESCRICAO, FK_TIPO_DE_GRUPO, ORDEM, ACTIVE_STATE, CREATED_AT, UPDATED_AT
        ) VALUES (
          '${username}', '${username}', 'Grupo unitário', 2, 1, 1, SYSDATE, SYSDATE
        )RETURNING PK_GRUPO INTO :outId
      `,
          {
            outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          } as any,
        );
        if (result?.outId[0] == undefined) {
          throw new Error(
            `Erro ao criar grupo unitario para o utilizador ${username}`,
          );
        }
        grupoUnitarioId = result?.outId[0];

        // 8. Associar utilizador ao grupo
        await queryRunner.manager.query(`
        INSERT INTO FK2_MCA_TB_GRUPO_UTILIZADOR (
          FK_GRUPO, FK_UTILIZADOR, ORDEM, ACTIVE_STATE, CREATED_AT, UPDATED_AT
        ) VALUES (
          ${grupoUnitarioId}, ${utilizadorId}, 1, 1, SYSDATE, SYSDATE
        )
      `);
      }

      const grupoId = grupoUnitario ? grupoUnitario.PK_GRUPO : grupoUnitarioId;

      // 3. Verifica se já existe entrada removida
      const [removido] = await queryRunner.manager.query(
        `
        SELECT FK_GRUPO, FK_ACESSO
        FROM FK2_MCA_TB_GRUPO_ACESSO_REMOVIDO
        WHERE FK_GRUPO = :grupoId
          AND FK_ACESSO = :acessoId
          AND ACTIVE_STATE = 1
        `,
        { grupoId, acessoId } as any,
      );

      if (removido) {
        // Reativa
        console.log(removido, 'removido');
        await queryRunner.manager.query(
          `
          UPDATE FK2_MCA_TB_GRUPO_ACESSO_REMOVIDO
          SET ACTIVE_STATE = 0,
              UPDATED_AT = SYSDATE,
              LAST_UPDATED_BY = :usuarioLogadoId
          WHERE FK_GRUPO = :grupoId and  FK_ACESSO = :acessoId
          `,
          {
            usuarioLogadoId,
            grupoId: removido.FK_GRUPO,
            acessoId: removido.FK_ACESSO,
          } as any,
        );
      } else {
        // Verifica se já existe
        const [jaExiste] = await queryRunner.manager.query(
          `
          SELECT 1
          FROM FK2_MCA_TB_GRUPO_ACESSO
          WHERE FK_GRUPO = :grupoId
            AND FK_ACESSO = :acessoId
            AND ACTIVE_STATE = 1
          `,
          { grupoId, acessoId } as any,
        );

        if (!jaExiste) {
          await queryRunner.manager.query(
            `
            MERGE INTO FK2_MCA_TB_GRUPO_ACESSO t
            USING (
              SELECT :grupoId AS FK_GRUPO, :acessoId AS FK_ACESSO FROM dual
            ) s
            ON (
              t.FK_GRUPO = s.FK_GRUPO
              AND t.FK_ACESSO = s.FK_ACESSO
            )
            WHEN MATCHED THEN
              UPDATE SET
                t.ACTIVE_STATE = 1,
                t.UPDATED_AT = SYSDATE
            WHEN NOT MATCHED THEN
              INSERT (
                PK_GRUPO_ACESSO,
                FK_GRUPO,
                FK_ACESSO,
                ACTIVE_STATE,
                CREATED_AT,
                UPDATED_AT,
                CREATED_BY,
                LAST_UPDATED_BY
              )
              VALUES (
                :pkGrupoAcesso,
                :grupoId,
                :acessoId,
                1,
                SYSDATE,
                SYSDATE,
                :usuarioLogadoId,
                :usuarioLogadoId
              )
            `,
            { pkGrupoAcesso, grupoId, acessoId, usuarioLogadoId } as any,
          );
        }
      }

      // 4. Log
      const logDescricao = `Adicionado acesso ${acessoId} ao utilizador ${utilizadorId} pelo usuário ${usuarioLogadoId}`;

      await queryRunner.manager.query(
        `
        INSERT INTO FK2_TB_LOG_ACESSOS_FUNCIONALIDADE (
          DESCRICAO,
          FK_UTILIZADOR_RESPONSAVEL,
          FK_ACESSO,
          FK_OPERACAO_LOG,
          CREATED_AT
        ) VALUES (:logDescricao, :usuarioLogadoId, :acessoId, 1, SYSDATE)
        `,
        { logDescricao, usuarioLogadoId, acessoId } as any,
      );

      await queryRunner.commitTransaction();

      return { message: 'Acesso adicionado/reativado com sucesso' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Erro ao adicionar acesso', error);
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException('Falha ao adicionar acesso');
    } finally {
      await queryRunner.release();
    }
  }

  async removerAcesso(
    utilizadorId: number,
    acessoId: number,
    usuarioLogadoId: number,
  ): Promise<{ message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Busca grupo unitário (corrigido para maiúsculas)
      const [grupoUnitario] = await queryRunner.manager.query(
        `
        SELECT PK_GRUPO
        FROM FK2_MCA_TB_GRUPO
        WHERE FK_TIPO_DE_GRUPO = 2
          AND SIGLA = (SELECT USERNAME FROM FK2_MCA_TB_UTILIZADOR WHERE PK_UTILIZADOR = :utilizadorId)
        `,
        [utilizadorId],
      );

      if (!grupoUnitario) {
        throw new NotFoundException('Grupo unitário não encontrado');
      }

      const grupoId = grupoUnitario.PK_GRUPO;

      // Verifica se já removido
      const [jaRemovido] = await queryRunner.manager.query(
        `
        SELECT PK_GRUPO_ACESSO_REMOVIDO
        FROM FK2_MCA_TB_GRUPO_ACESSO_REMOVIDO
        WHERE FK_GRUPO = :grupoId AND FK_ACESSO = :acessoId
        `,
        [grupoId, acessoId],
      );

      if (jaRemovido) {
        await queryRunner.manager.query(
          `
          UPDATE FK2_MCA_TB_GRUPO_ACESSO_REMOVIDO
          SET ACTIVE_STATE = 1,
              UPDATED_AT = SYSDATE,
              LAST_UPDATED_BY = :usuarioLogadoId
          WHERE FK_GRUPO = :grupoId
          `,
          { usuarioLogadoId, grupoId: jaRemovido.PK_GRUPO } as any,
        );
      } else {
        await queryRunner.manager.query(
          `
          INSERT INTO FK2_MCA_TB_GRUPO_ACESSO_REMOVIDO (
            FK_GRUPO, FK_ACESSO, ACTIVE_STATE, CREATED_AT, UPDATED_AT, CREATED_BY, LAST_UPDATED_BY
          ) VALUES (:grupoId, :acessoId, 1, SYSDATE, SYSDATE, :usuarioLogadoId, :usuarioLogadoId)
          `,
          [grupoId, acessoId, usuarioLogadoId, usuarioLogadoId],
        );
      }

      // Log
      const logDescricao = `Removido acesso ${acessoId} do utilizador ${utilizadorId} por ${usuarioLogadoId}`;

      await queryRunner.manager.query(
        `
        INSERT INTO FK2_TB_LOG_ACESSOS_FUNCIONALIDADE (
          DESCRICAO,
          FK_UTILIZADOR_RESPONSAVEL,
          FK_ACESSO,
          FK_OPERACAO_LOG,
          CREATED_AT
        ) VALUES (:logDescricao, :usuarioLogadoId, :acessoId, 2, SYSDATE)
        `,
        [logDescricao, usuarioLogadoId, acessoId],
      );

      await queryRunner.commitTransaction();

      return { message: 'Acesso removido/revogado com sucesso' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Erro ao remover acesso', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
