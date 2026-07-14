
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FilterAcessoDto } from './dto/filter-acesso.dto';
import { AcessoResponseDto } from './dto/acesso.response.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { CreateAcessoDto } from './dto/create-acesso.dto';
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
  async criarAcesso(dto: CreateAcessoDto, userId: string): Promise<any> {
    const {
      designacao,
      descricao,
      sigla,
      icone,
      fkModulo,
      fkSubmenu,
      fkPagina,
      fkTipoAcesso,
      obs,
      ordem,
      activeDate,
      activeState = true,
    } = dto;

    if (!designacao || !sigla) {
      throw new BadRequestException('Designação e Sigla são obrigatórios');
    }

    const sql = `
      INSERT INTO FK2_MCA_TB_ACESSO (
        DESIGNACAO,
        DESCRICAO,
        SIGLA,
        ICONE,
        FK_MODULO,
        FK_SUBMENU,
        FK_PAGINA,
        FK_TIPO_ACESSO,
        OBS,
        ORDEM,
        CREATED_BY,
        LAST_UPDATED_BY,
        CREATED_AT,
        UPDATED_AT,
        ACTIVE_DATE,
        ACTIVE_STATE
      )
      VALUES (
        :designacao,
        :descricao,
        :sigla,
        :icone,
        :fkModulo,
        :fkSubmenu,
        :fkPagina,
        :fkTipoAcesso,
        :obs,
        :ordem,
        :createdBy,
        :lastUpdatedBy,
        SYSDATE,
        SYSDATE,
        :activeDate,
        :activeState
      )
      RETURNING
        PK_ACESSO,
        DESIGNACAO,
        DESCRICAO,
        SIGLA,
        ICONE,
        FK_MODULO,
        FK_SUBMENU,
        FK_PAGINA,
        FK_TIPO_ACESSO,
        OBS,
        ORDEM,
        CREATED_BY,
        LAST_UPDATED_BY,
        CREATED_AT,
        UPDATED_AT,
        ACTIVE_DATE,
        ACTIVE_STATE
      INTO
        :pkAcesso,
        :designacaoOut,
        :descricaoOut,
        :siglaOut,
        :iconeOut,
        :fkModuloOut,
        :fkSubmenuOut,
        :fkPaginaOut,
        :fkTipoAcessoOut,
        :obsOut,
        :ordemOut,
        :createdByOut,
        :lastUpdatedByOut,
        :createdAtOut,
        :updatedAtOut,
        :activeDateOut,
        :activeStateOut
    `;

    const params = {
      designacao,
      descricao: descricao || null,
      sigla,
      icone: icone || null,
      fkModulo: fkModulo || null,
      fkSubmenu: fkSubmenu || null,
      fkPagina: fkPagina || null,
      fkTipoAcesso: fkTipoAcesso || null,
      obs: obs || null,
      ordem: ordem || null,
      createdBy: userId,
      lastUpdatedBy: userId,
      activeDate: activeDate ? new Date(activeDate) : null,
      activeState: activeState ? 1 : 0,

      pkAcesso: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      designacaoOut: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      descricaoOut: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      siglaOut: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      iconeOut: { dir: oracledb.BIND_OUT, type: oracledb.STRING },

      fkModuloOut: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      fkSubmenuOut: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      fkPaginaOut: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      fkTipoAcessoOut: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },

      obsOut: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      ordemOut: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },

      createdByOut: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
      lastUpdatedByOut: { dir: oracledb.BIND_OUT, type: oracledb.STRING },

      createdAtOut: { dir: oracledb.BIND_OUT, type: oracledb.DATE },
      updatedAtOut: { dir: oracledb.BIND_OUT, type: oracledb.DATE },
      activeDateOut: { dir: oracledb.BIND_OUT, type: oracledb.DATE },
      activeStateOut: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    };

    try {
      const result = await this.dataSource.query(sql, params as any);

      // No Oracle com RETURNING, o resultado vem como array de objetos com os campos de saída
      if (!result || result.length === 0) {
        throw new InternalServerErrorException('Falha ao inserir o acesso');
      }

      const novoAcesso = result[0]; // Primeiro registro retornado

      // Converte chaves para lowercase se a função existir
      return toLowerCaseKeys ? toLowerCaseKeys(novoAcesso) : novoAcesso;
    } catch (error) {
      this.logger.error('Erro ao criar acesso', error);
      throw new InternalServerErrorException('Falha ao cadastrar acesso');
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

    if (filter.apenasAtivos === 'false') {
      whereClause += ' AND A.ACTIVE_STATE = 0';
    }

    if (filter.sigla) {
      whereClause += ` AND A.SIGLA LIKE :${params.length + 1}`;
      params.push(`%${filter.sigla}%`);
    }

    if (filter.designacao) {
      whereClause += ` AND A.DESIGNACAO LIKE :${params.length + 1}`;
      params.push(`%${filter.designacao}%`);
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
    // 1. Iniciamos a transação pelo dataSource
    return this.dataSource.transaction(async (manager) => {
      let grupoUnitarioId: number | null = null;

      try {
        // 2. Verifica se o acesso existe
        const [acessoExiste] = await manager.query(
          `SELECT 1 FROM FK2_MCA_TB_ACESSO WHERE PK_ACESSO = :acessoId AND ACTIVE_STATE = 1`,
          [acessoId],
        );
        if (!acessoExiste) {
          throw new NotFoundException('Acesso não encontrado ou inativo');
        }

        // 3. Busca o grupo unitário do utilizador
        const [grupoUnitario] = await manager.query(
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

        // 4. Se o grupo não existir, cria um novo
        if (!grupoUnitario) {
          // Importante: Certifique-se que o getUsername não abra outra conexão externa se possível
          const username = await this.getUsername(utilizadorId);

          const result = await manager.query(
            `
          INSERT INTO FK2_MCA_TB_GRUPO (
            DESIGNACAO, SIGLA, DESCRICAO, FK_TIPO_DE_GRUPO, ORDEM, ACTIVE_STATE, CREATED_AT, UPDATED_AT
          ) VALUES (
            :username, :username, 'Grupo unitário', 2, 1, 1, SYSDATE, SYSDATE
          ) RETURNING PK_GRUPO INTO :outId
          `,
            {
              username,
              outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            } as any,
          );

          if (!result?.outId || result.outId[0] === undefined) {
            throw new Error(
              `Erro ao criar grupo unitário para o utilizador ${username}`,
            );
          }

          grupoUnitarioId = result.outId[0];

          // 5. Associar utilizador ao grupo criado
          await manager.query(
            `
          INSERT INTO FK2_MCA_TB_GRUPO_UTILIZADOR (
            FK_GRUPO, FK_UTILIZADOR, ORDEM, ACTIVE_STATE, CREATED_AT, UPDATED_AT
          ) VALUES (
            :grupoId, :utilizadorId, 1, 1, SYSDATE, SYSDATE
          )
        `,
            [grupoUnitarioId, utilizadorId],
          );
        }

        // Define qual ID de grupo usar (o existente ou o que acabou de ser criado)
        const grupoId = grupoUnitario
          ? grupoUnitario.PK_GRUPO
          : grupoUnitarioId;

        // 6. Verifica se já existe entrada removida para reativar
        const [removido] = await manager.query(
          `
        SELECT FK_GRUPO, FK_ACESSO, PK_GRUPO_ACESSO_REMOVIDO
        FROM FK2_MCA_TB_GRUPO_ACESSO_REMOVIDO
        WHERE FK_GRUPO = :grupoId
          AND FK_ACESSO = :acessoId
          AND ACTIVE_STATE = 1
        `,
          { grupoId, acessoId } as any,
        );

        if (removido) {
          // Reativa na tabela de removidos (SET ACTIVE_STATE = 0)
          await manager.query(
            `
          UPDATE FK2_MCA_TB_GRUPO_ACESSO_REMOVIDO
          SET ACTIVE_STATE = 0,
              UPDATED_AT = SYSDATE,
              LAST_UPDATED_BY = :usuarioLogadoId
          WHERE PK_GRUPO_ACESSO_REMOVIDO = :pk
          `,
            {
              usuarioLogadoId,
              pk: removido.PK_GRUPO_ACESSO_REMOVIDO,
            } as any,
          );
        } else {
          // 7. Verifica se já existe na tabela principal
          const [jaExiste] = await manager.query(
            `
          SELECT 1 FROM FK2_MCA_TB_GRUPO_ACESSO
          WHERE FK_GRUPO = :grupoId AND FK_ACESSO = :acessoId AND ACTIVE_STATE = 1
          `,
            { grupoId, acessoId } as any,
          );

          if (!jaExiste) {
            // 8. MERGE Final
            await manager.query(
              `
            MERGE INTO FK2_MCA_TB_GRUPO_ACESSO t
            USING (SELECT :grupoId AS FK_GRUPO, :acessoId AS FK_ACESSO FROM dual) s
            ON (t.FK_GRUPO = s.FK_GRUPO AND t.FK_ACESSO = s.FK_ACESSO)
            WHEN MATCHED THEN
              UPDATE SET t.ACTIVE_STATE = 1, t.UPDATED_AT = SYSDATE
            WHEN NOT MATCHED THEN
              INSERT (FK_GRUPO, FK_ACESSO, ACTIVE_STATE, CREATED_AT, UPDATED_AT, CREATED_BY, LAST_UPDATED_BY)
              VALUES (:grupoId, :acessoId, 1, SYSDATE, SYSDATE, :usuarioLogadoId, :usuarioLogadoId)
            `,
              { grupoId, acessoId, usuarioLogadoId } as any,
            );
          }
        }

        return { message: 'Acesso adicionado/reativado com sucesso' };
      } catch (error) {
        // Rollback automático pelo TypeORM
        this.logger.error('Erro ao adicionar acesso', error);
        throw error instanceof NotFoundException
          ? error
          : new InternalServerErrorException('Falha ao adicionar acesso');
      }
    });
  }

  async removerAcesso(
    utilizadorId: number,
    acessoId: number,
    usuarioLogadoId: number,
  ): Promise<{ message: string }> {
    // 1. Iniciamos a transação diretamente pelo dataSource
    return this.dataSource.transaction(async (manager) => {
      try {
        const queryGrupo = `
        SELECT PK_GRUPO
        FROM FK2_MCA_TB_GRUPO
        WHERE FK_TIPO_DE_GRUPO = 2
          AND SIGLA = (SELECT USERNAME FROM FK2_MCA_TB_UTILIZADOR WHERE PK_UTILIZADOR = :utilizadorId)
      `;

        const grupos = await manager.query(queryGrupo, [utilizadorId]);
        const grupoUnitario = grupos[0];

        if (!grupoUnitario) {
          throw new NotFoundException('Grupo unitário não encontrado');
        }

        const grupoId = grupoUnitario.PK_GRUPO;

        const queryJaRemovido = `
        SELECT PK_GRUPO_ACESSO_REMOVIDO
        FROM FK2_MCA_TB_GRUPO_ACESSO_REMOVIDO
        WHERE FK_GRUPO = :grupoId AND FK_ACESSO = :acessoId
      `;

        const resultadosRemovidos = await manager.query(queryJaRemovido, [
          grupoId,
          acessoId,
        ]);
        const jaRemovido = resultadosRemovidos[0];

        if (jaRemovido) {
          await manager.query(
            `
          UPDATE FK2_MCA_TB_GRUPO_ACESSO_REMOVIDO
          SET ACTIVE_STATE = 1,
              UPDATED_AT = SYSDATE,
              LAST_UPDATED_BY = :usuarioLogadoId
          WHERE PK_GRUPO_ACESSO_REMOVIDO = :pk
          `,
            [usuarioLogadoId, jaRemovido.PK_GRUPO_ACESSO_REMOVIDO],
          );
        } else {
          await manager.query(
            `
          INSERT INTO FK2_MCA_TB_GRUPO_ACESSO_REMOVIDO (
            FK_GRUPO, FK_ACESSO, ACTIVE_STATE, CREATED_AT, UPDATED_AT, CREATED_BY, LAST_UPDATED_BY
          ) VALUES (:grupoId, :acessoId, 1, SYSDATE, SYSDATE, :usuarioLogadoId, :usuarioLogadoId)
          `,
            [grupoId, acessoId, usuarioLogadoId, usuarioLogadoId],
          );
        }

        return { message: 'Acesso removido/revogado com sucesso' };
      } catch (error) {
        this.logger.error('Erro ao remover acesso', error);
        throw error;
      }
    });
  }
  async adicionarGrupoAcesso(
    grupoId: number,
    acessoId: number,
    usuarioLogadoId: number,
  ): Promise<{ message: string }> {
    return this.dataSource.transaction(async (manager) => {
      try {
        const [acessoExiste] = await manager.query(
          `SELECT 1 FROM FK2_MCA_TB_ACESSO WHERE PK_ACESSO = :acessoId AND ACTIVE_STATE = 1`,
          [acessoId],
        );

        if (!acessoExiste) {
          throw new NotFoundException('Acesso não encontrado ou inativo');
        }

        const [grupo] = await manager.query(
          `
        SELECT G.PK_GRUPO
        FROM FK2_MCA_TB_GRUPO G
        WHERE PK_GRUPO = :grupoId
          AND G.ACTIVE_STATE = 1
        `,
          [grupoId],
        );

        if (!grupo) {
          throw new Error(`Erro ao adicionar acesso, grupo não encontrado`);
        }

        const [removido] = await manager.query(
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
          await manager.query(
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
          const [jaExiste] = await manager.query(
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
            await manager.query(
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
               
                FK_GRUPO,
                FK_ACESSO,
                ACTIVE_STATE,
                CREATED_AT,
                UPDATED_AT,
                CREATED_BY,
                LAST_UPDATED_BY
              )
              VALUES (
            
                :grupoId,
                :acessoId,
                1,
                SYSDATE,
                SYSDATE,
                :usuarioLogadoId,
                :usuarioLogadoId
              )
            `,
              { grupoId, acessoId, usuarioLogadoId } as any,
            );
          }
        }

        return { message: 'Acesso adicionado/reativado com sucesso' };
      } catch (error) {
        this.logger.error('Erro ao adicionar acesso', error);
        throw error instanceof NotFoundException
          ? error
          : new InternalServerErrorException('Falha ao adicionar acesso');
      }
    });
  }
  async removerGrupoAcesso(
    grupoId: number,
    acessoId: number,
    usuarioLogadoId: number,
  ): Promise<{ message: string }> {
    return this.dataSource.transaction(async (manager) => {
      try {
        const [acessoExiste] = await manager.query(
          `SELECT 1 FROM FK2_MCA_TB_ACESSO WHERE PK_ACESSO = :acessoId AND ACTIVE_STATE = 1`,
          [acessoId],
        );

        if (!acessoExiste) {
          throw new NotFoundException('Acesso não encontrado ou inativo');
        }

        const [grupo] = await manager.query(
          `
        SELECT G.PK_GRUPO
        FROM FK2_MCA_TB_GRUPO G
        WHERE PK_GRUPO = :grupoId
          AND G.ACTIVE_STATE = 1
        `,
          [grupoId],
        );

        if (!grupo) {
          throw new Error(`Erro ao remover acesso, grupo não encontrado`);
        }

        const [jaRemovido] = await manager.query(
          `
        SELECT PK_GRUPO_ACESSO_REMOVIDO
        FROM FK2_MCA_TB_GRUPO_ACESSO_REMOVIDO
        WHERE FK_GRUPO = :grupoId AND FK_ACESSO = :acessoId
        `,
          [grupoId, acessoId],
        );

        if (jaRemovido) {
          await manager.query(
            `
          UPDATE FK2_MCA_TB_GRUPO_ACESSO_REMOVIDO
          SET ACTIVE_STATE = 1,
              UPDATED_AT = SYSDATE,
              LAST_UPDATED_BY = :usuarioLogadoId
          WHERE PK_GRUPO_ACESSO_REMOVIDO = :pkRemovido
          `,
            {
              usuarioLogadoId,
              pkRemovido: jaRemovido.PK_GRUPO_ACESSO_REMOVIDO,
            } as any,
          );
        } else {
          await manager.query(
            `
          INSERT INTO FK2_MCA_TB_GRUPO_ACESSO_REMOVIDO (
            FK_GRUPO, FK_ACESSO, ACTIVE_STATE, CREATED_AT, UPDATED_AT, CREATED_BY, LAST_UPDATED_BY
          ) VALUES (:grupoId, :acessoId, 1, SYSDATE, SYSDATE, :usuarioLogadoId, :usuarioLogadoId)
          `,
            [grupoId, acessoId, usuarioLogadoId, usuarioLogadoId],
          );
        }

        return { message: 'Acesso removido/revogado com sucesso' };
      } catch (error) {
        this.logger.error('Erro ao remover acesso', error);
        throw error;
      }
    });
  }
  async atualizarEstadoAcesso(acessoId: number, userId: number) {
    try {
      const result = await this.dataSource.query(
        `
      SELECT ACTIVE_STATE
      FROM FK2_MCA_TB_ACESSO
      WHERE PK_ACESSO = :1
      `,
        [acessoId],
      );

      if (!result.length) {
        throw new NotFoundException('Acesso não encontrado');
      }

      await this.dataSource.query(
        `
      UPDATE FK2_MCA_TB_ACESSO
      SET ACTIVE_STATE = CASE
        WHEN ACTIVE_STATE = 1 THEN 0
        ELSE 1
      END
      WHERE PK_ACESSO = :1
      `,
        [acessoId],
      );

      return { success: true };
    } catch (error) {
      this.logger.error('Erro ao atualizar estado do acesso', error);
      throw new InternalServerErrorException(
        'Falha ao atualizar estado do acesso',
      );
    }
  }

  async addAccessRestriction(
    codigoAcesso: number,
    codigoUtilizador: number,
  ): Promise<{ message: string }> {
    const existing = await this.dataSource.query(
      `SELECT CODIGO_ACESSO, CODIGO_UTILIZADOR, STATUS FROM FK2_RESTRICOES_ACESSOS WHERE CODIGO_ACESSO = :1 AND CODIGO_UTILIZADOR = :2`,
      [codigoAcesso, codigoUtilizador],
    );

    if (existing && existing.length > 0) {
      await this.dataSource.query(
        `UPDATE FK2_RESTRICOES_ACESSOS SET STATUS = 1 WHERE CODIGO_ACESSO = :1 AND CODIGO_UTILIZADOR = :2`,
        [codigoAcesso, codigoUtilizador],
      );
      return { message: 'Restrição atualizada para ativa.' };
    }

    await this.dataSource.query(
      `INSERT INTO FK2_RESTRICOES_ACESSOS (CODIGO_ACESSO, CODIGO_UTILIZADOR, STATUS) VALUES (:1, :2, 1)`,
      [codigoAcesso, codigoUtilizador],
    );

    return { message: 'Restrição de acesso criada com sucesso.' };
  }
  async removeAccessRestriction(
    codigoAcesso: number,
    codigoUtilizador: number,
  ): Promise<{ message: string }> {
    await this.dataSource.query(
      `UPDATE FK2_RESTRICOES_ACESSOS SET STATUS = 0 WHERE CODIGO_ACESSO = :1 AND CODIGO_UTILIZADOR = :2`,
      [codigoAcesso, codigoUtilizador],
    );

    return { message: 'Restrição de acesso removida (inativada).' };
  }

  async getRestrictionsByUser(codigoUtilizador: number): Promise<any[]> {
    const result = await this.dataSource.query(
      `
        SELECT CODIGO_ACESSO
             , A.DESIGNACAO
             , A.SIGLA
             , STATUS
        FROM FK2_RESTRICOES_ACESSOS
           , FK2_MCA_TB_ACESSO A
        WHERE CODIGO_ACESSO     = A.PK_ACESSO
          AND CODIGO_UTILIZADOR = :1
      `,
      [codigoUtilizador],
    );

    return toLowerCaseKeys(result);
  }
  async getRestrictionsByAccess(codigoAcesso: number): Promise<any[]> {
    const result = await this.dataSource.query(
      `SELECT CODIGO_ACESSO, CODIGO_UTILIZADOR, STATUS FROM FK2_RESTRICOES_ACESSOS WHERE CODIGO_ACESSO = :1`,
      [codigoAcesso],
    );

    return toLowerCaseKeys(result);
  }
}
