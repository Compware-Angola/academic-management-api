// src/acessos/acessos.service.ts
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

@Injectable()
export class AcessosService {
  private readonly logger = new Logger(AcessosService.name);

  constructor(private readonly dataSource: DataSource) {}
async listarAcessosDropDown(filter: FilterAcessoDto): Promise<AcessoResponseDto[]> {
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
      activeDate: activeDate || null,
      activeState: activeState ? 1 : 0,

      // Bindings para RETURNING (TypeORM com Oracle usa objetos de saída)
      pkAcesso: { dir: 3003, type: 2 },         // 3003 = DB_TYPE_NUMBER
      designacaoOut: { dir: 3003, type: 2001 }, // 2001 = DB_TYPE_VARCHAR
      descricaoOut: { dir: 3003, type: 2001 },
      siglaOut: { dir: 3003, type: 2001 },
      iconeOut: { dir: 3003, type: 2001 },
      fkModuloOut: { dir: 3003, type: 2 },
      fkSubmenuOut: { dir: 3003, type: 2 },
      fkPaginaOut: { dir: 3003, type: 2 },
      fkTipoAcessoOut: { dir: 3003, type: 2 },
      obsOut: { dir: 3003, type: 2001 },
      ordemOut: { dir: 3003, type: 2 },
      createdByOut: { dir: 3003, type: 2001 },
      lastUpdatedByOut: { dir: 3003, type: 2001 },
      createdAtOut: { dir: 3003, type: 2019 },  // DATE
      updatedAtOut: { dir: 3003, type: 2019 },
      activeDateOut: { dir: 3003, type: 2019 },
      activeStateOut: { dir: 3003, type: 2 },
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
      this.logger.error('Erro ao criar novo acesso (Oracle)', error.stack);

      // Erro de unique constraint no Oracle geralmente é ORA-00001
      if (error.code === 'ORA-00001') {
        throw new BadRequestException('Sigla já existe no sistema');
      }

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

  async adicionarAcesso(
    utilizadorId: number,
    acessoId: number,
    usuarioLogadoId: number,
  ): Promise<{ message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

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
      console.log(grupoUnitario);

      if (!grupoUnitario) {



        throw new NotFoundException(
          'Grupo unitário do utilizador não encontrado',
        );
      }

      const grupoId = grupoUnitario.PK_GRUPO;

      // 3. Verifica se já existe entrada removida
      const [removido] = await queryRunner.manager.query(
        `
        SELECT FK_GRUPO FK_ACESSO
        FROM FK2_MCA_TB_GRUPO_ACESSO_REMOVIDO
        WHERE FK_GRUPO = :grupoId
          AND FK_ACESSO = :acessoId
          AND ACTIVE_STATE = 1
        `,
        { grupoId, acessoId } as any,
      );

      if (removido) {
        // Reativa
        await queryRunner.manager.query(
          `
          UPDATE FK2_MCA_TB_GRUPO_ACESSO_REMOVIDO
          SET ACTIVE_STATE = 0,
              UPDATED_AT = SYSDATE,
              LAST_UPDATED_BY = :usuarioLogadoId
          WHERE FK_GRUPO = :grupoId
          `,
          { usuarioLogadoId, grupoId: removido.FK_GRUPO } as any,
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
