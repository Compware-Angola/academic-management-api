import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FilterCargoDto } from './dto/filter-cargo.dto';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateOcupanteDto } from './dto/update-ocupante.dto';
import { CargoResponseDto } from './dto/cargo.response.dto';

@Injectable()
export class CargosAdministrativosService {
  private readonly logger = new Logger(CargosAdministrativosService.name);

  // Constantes do teu bean
  private readonly CARGO_REITORIA = 1;
  private readonly CARGO_VICEREITOR = 5;
  private readonly CARGO_ASSESSORA = 6;
  private readonly CARGO_DECANO = 10;
  private readonly CARGO_COORDENADOR = 9;
  private readonly CARGO_DIRECTOR = 8;

  private readonly GRUPO_REITORIA = 17;
  private readonly GRUPO_DECANO = 13;
  private readonly GRUPO_DIRECTOR = 5;
  private readonly GRUPO_COORDENADOR = 4450;

  constructor(private readonly dataSource: DataSource) {}

  // ────────────────────────────────────────────────────────────────
  // Métodos de Listagem / Consulta
  // ────────────────────────────────────────────────────────────────

  async listarTodos(filter: FilterCargoDto): Promise<CargoResponseDto[]> {
    let whereClause = 'WHERE C.ACTIVE = 1';
    const params: any[] = [];

    if (filter.tipoCargoId !== undefined && filter.tipoCargoId !== 0) {
      whereClause += ' AND C.FK_TIPO_CARGO = ?';
      params.push(filter.tipoCargoId);
    }

    if (filter.utilizadorId) {
      whereClause += ' AND C.FK_UTILIZADOR = ?';
      params.push(filter.utilizadorId);
    }

    const sql = `
      SELECT 
        C.PK_CARGO,
        C.FK_TIPO_CARGO,
        TC.DESCRICAO AS TIPO_CARGO_DESCRICAO,
        C.FK_UTILIZADOR,
        U.NOME AS UTILIZADOR_NOME,
        C.FK_FACULDADE,
        F.DESIGNACAO AS FACULDADE_NOME,
        C.FK_CURSO,
        CUR.DESIGNACAO AS CURSO_NOME,
        C.ACTIVE,
        C.CREATED_AT,
        C.CREATED_BY
      FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS C
      LEFT JOIN FK2_TB_TIPO_CARGO_ADMINISTRATIVO TC ON C.FK_TIPO_CARGO = TC.PK_TIPO_CARGO
      LEFT JOIN FK2_MCA_TB_UTILIZADOR U ON C.FK_UTILIZADOR = U.PK_UTILIZADOR
      LEFT JOIN FK2_TB_FACULDADE F ON C.FK_FACULDADE = F.CODIGO
      LEFT JOIN FK2_TB_CURSOS CUR ON C.FK_CURSO = CUR.CODIGO
      ${whereClause}
      ORDER BY C.CREATED_AT DESC
    `;

    try {
      const result = await this.dataSource.query(sql, params);
      return result.map(row => new CargoResponseDto(row));
    } catch (error) {
      this.logger.error('Erro ao listar cargos', error);
      throw new InternalServerErrorException('Falha ao listar cargos');
    }
  }

  async listarPorUtilizador(utilizadorId: number): Promise<CargoResponseDto[]> {
    const sql = `
      SELECT 
        C.PK_CARGO,
        C.FK_TIPO_CARGO,
        TC.DESCRICAO AS TIPO_CARGO_DESCRICAO,
        C.FK_UTILIZADOR,
        U.NOME AS UTILIZADOR_NOME,
        C.FK_FACULDADE,
        F.DESIGNACAO AS FACULDADE_NOME,
        C.FK_CURSO,
        CUR.DESIGNACAO AS CURSO_NOME,
        C.ACTIVE,
        C.CREATED_AT,
        C.CREATED_BY
      FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS C
      LEFT JOIN FK2_TB_TIPO_CARGO_ADMINISTRATIVO TC ON C.FK_TIPO_CARGO = TC.PK_TIPO_CARGO
      LEFT JOIN FK2_MCA_TB_UTILIZADOR U ON C.FK_UTILIZADOR = U.PK_UTILIZADOR
      LEFT JOIN FK2_TB_FACULDADE F ON C.FK_FACULDADE = F.CODIGO
      LEFT JOIN FK2_TB_CURSOS CUR ON C.FK_CURSO = CUR.CODIGO
      WHERE C.FK_UTILIZADOR = ?
        AND C.ACTIVE = 1
      ORDER BY C.CREATED_AT DESC
    `;

    try {
      const result = await this.dataSource.query(sql, [utilizadorId]);
      return result.map(row => new CargoResponseDto(row));
    } catch (error) {
      this.logger.error(`Erro ao listar cargos do utilizador ${utilizadorId}`, error);
      throw new InternalServerErrorException('Falha ao listar cargos do utilizador');
    }
  }

  async hasAnyCargos(cargos: number[], utilizadorId: number): Promise<boolean> {
    if (cargos.length === 0) return false;

    const placeholders = cargos.map(() => '?').join(', ');
    const sql = `
      SELECT COUNT(*) AS COUNT
      FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS C
      WHERE C.FK_UTILIZADOR = ?
        AND C.FK_TIPO_CARGO IN (${placeholders})
        AND C.ACTIVE = 1
    `;

    const params = [utilizadorId, ...cargos];

    try {
      const [row] = await this.dataSource.query(sql, params);
      return Number(row.COUNT) >= 1;
    } catch (error) {
      this.logger.error('Erro ao verificar cargos do utilizador', error);
      throw new InternalServerErrorException('Falha na verificação de cargos');
    }
  }

  async hasCargo(cargoId: number, utilizadorId: number): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) AS COUNT
      FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS C
      WHERE C.FK_UTILIZADOR = ?
        AND C.FK_TIPO_CARGO = ?
        AND C.ACTIVE = 1
    `;

    try {
      const [row] = await this.dataSource.query(sql, [utilizadorId, cargoId]);
      return Number(row.COUNT) >= 1;
    } catch (error) {
      this.logger.error('Erro ao verificar cargo específico', error);
      throw new InternalServerErrorException('Falha na verificação');
    }
  }

  async isCargoDefinido(cargoCodigo: number, curso?: number | null): Promise<boolean> {
    let sql = `
      SELECT COUNT(*) AS COUNT
      FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS C
      WHERE C.FK_TIPO_CARGO = ?
        AND C.ACTIVE = 1
    `;
    const params: any[] = [cargoCodigo];

    if (curso !== null && curso !== undefined) {
      sql += ' AND C.FK_CURSO = ?';
      params.push(curso);
    }

    try {
      const [row] = await this.dataSource.query(sql, params);
      return Number(row.COUNT) > 0;
    } catch (error) {
      this.logger.error('Erro ao verificar cargo definido', error);
      throw new InternalServerErrorException('Falha na verificação');
    }
  }

  async isCargoDefinidoByFaculdade(cargoCodigo: number, faculdade: number): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) AS COUNT
      FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS C
      WHERE C.FK_TIPO_CARGO = ?
        AND C.FK_FACULDADE = ?
        AND C.ACTIVE = 1
    `;

    try {
      const [row] = await this.dataSource.query(sql, [cargoCodigo, faculdade]);
      return Number(row.COUNT) > 0;
    } catch (error) {
      this.logger.error('Erro ao verificar cargo por faculdade', error);
      throw new InternalServerErrorException('Falha na verificação');
    }
  }

  async listarPorTipoCargo(tipoCargoAdministrativo: number): Promise<CargoResponseDto[]> {
    const sql = `
      SELECT 
        C.PK_CARGO,
        C.FK_TIPO_CARGO,
        TC.DESCRICAO AS TIPO_CARGO_DESCRICAO,
        C.FK_UTILIZADOR,
        U.NOME AS UTILIZADOR_NOME,
        C.FK_FACULDADE,
        F.DESIGNACAO AS FACULDADE_NOME,
        C.FK_CURSO,
        CUR.DESIGNACAO AS CURSO_NOME,
        C.ACTIVE,
        C.CREATED_AT,
        C.CREATED_BY
      FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS C
      LEFT JOIN FK2_TB_TIPO_CARGO_ADMINISTRATIVO TC ON C.FK_TIPO_CARGO = TC.PK_TIPO_CARGO
      LEFT JOIN FK2_MCA_TB_UTILIZADOR U ON C.FK_UTILIZADOR = U.PK_UTILIZADOR
      LEFT JOIN FK2_TB_FACULDADE F ON C.FK_FACULDADE = F.CODIGO
      LEFT JOIN FK2_TB_CURSOS CUR ON C.FK_CURSO = CUR.CODIGO
      WHERE C.FK_TIPO_CARGO = ?
        AND C.ACTIVE = 1
      ORDER BY C.CREATED_AT DESC
    `;

    try {
      const result = await this.dataSource.query(sql, [tipoCargoAdministrativo, tipoCargoAdministrativo]);
      return result.map(row => new CargoResponseDto(row));
    } catch (error) {
      this.logger.error(`Erro ao listar cargos por tipo ${tipoCargoAdministrativo}`, error);
      throw new InternalServerErrorException('Falha ao listar cargos por tipo');
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Métodos de Escrita
  // ────────────────────────────────────────────────────────────────

  async criarCargoReitoria(
    dto: CreateCargoDto,
    usuarioLogadoId: number,
  ): Promise<{ message: string; pkCargo: number }> {
    const tiposReitoria = [this.CARGO_REITORIA, this.CARGO_VICEREITOR, this.CARGO_ASSESSORA];
    if (!tiposReitoria.includes(dto.tipoCargoId)) {
      throw new BadRequestException('Tipo de cargo inválido para Reitoria');
    }

    if (dto.faculdadeId || dto.cursoId) {
      throw new BadRequestException('Cargos de Reitoria não devem ter faculdade ou curso');
    }

    const jaDefinido = await this.isCargoDefinido(dto.tipoCargoId, null);
    if (jaDefinido) {
      throw new BadRequestException('Este cargo de Reitoria já está atribuído');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hasAny = await this.hasAnyCargos(tiposReitoria, dto.utilizadorId);

      if (!hasAny) {
        await this.adicionarAoGrupo(queryRunner, dto.utilizadorId, this.GRUPO_REITORIA, usuarioLogadoId);
      }

      const { pkCargo } = await this.criarCargoBase(queryRunner, dto, usuarioLogadoId);

      if (!hasAny) {
        await this.permissaoReitor(queryRunner, dto.utilizadorId, usuarioLogadoId);
      }

      await queryRunner.commitTransaction();

      return { message: 'Cargo de Reitoria atribuído com sucesso', pkCargo };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error instanceof BadRequestException
        ? error
        : new InternalServerErrorException('Falha ao atribuir cargo de Reitoria');
    } finally {
      await queryRunner.release();
    }
  }

  async criarCargoFaculdadeOuCurso(
    dto: CreateCargoDto,
    usuarioLogadoId: number,
  ): Promise<{ message: string; pkCargo: number }> {
    const tiposFaculdade = [this.CARGO_DECANO, this.CARGO_DIRECTOR, this.CARGO_COORDENADOR];
    if (!tiposFaculdade.includes(dto.tipoCargoId)) {
      throw new BadRequestException('Tipo de cargo inválido para Faculdade/Curso');
    }

    if (dto.tipoCargoId === this.CARGO_DECANO && !dto.faculdadeId) {
      throw new BadRequestException('Faculdade é obrigatória para Decano');
    }

    if ((dto.tipoCargoId === this.CARGO_DIRECTOR || dto.tipoCargoId === this.CARGO_COORDENADOR) && !dto.cursoId) {
      throw new BadRequestException('Curso é obrigatório para Director ou Coordenador');
    }

    const jaDefinido = dto.tipoCargoId === this.CARGO_DECANO
      ? await this.isCargoDefinidoByFaculdade(dto.tipoCargoId, dto.faculdadeId!)
      : await this.isCargoDefinido(dto.tipoCargoId, dto.cursoId);

    if (jaDefinido) {
      throw new BadRequestException('Este cargo já está atribuído');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let grupoId: number;
      if (dto.tipoCargoId === this.CARGO_DECANO) grupoId = this.GRUPO_DECANO;
      else if (dto.tipoCargoId === this.CARGO_DIRECTOR) grupoId = this.GRUPO_DIRECTOR;
      else grupoId = this.GRUPO_COORDENADOR;

      const hasAny = await this.hasAnyCargos(tiposFaculdade, dto.utilizadorId);
      if (!hasAny) {
        await this.adicionarAoGrupo(queryRunner, dto.utilizadorId, grupoId, usuarioLogadoId);
      }

      const { pkCargo } = await this.criarCargoBase(queryRunner, dto, usuarioLogadoId);

      await this.permissaoDecanoOuCurso(queryRunner, dto, usuarioLogadoId);

      await this.atualizarEntidadeFaculdadeOuCurso(queryRunner, dto, usuarioLogadoId);

      await queryRunner.commitTransaction();

      return { message: 'Cargo atribuído com sucesso', pkCargo };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error instanceof BadRequestException
        ? error
        : new InternalServerErrorException('Falha ao atribuir cargo de Faculdade/Curso');
    } finally {
      await queryRunner.release();
    }
  }

  private async criarCargoBase(
    queryRunner: any,
    dto: CreateCargoDto,
    usuarioLogadoId: number,
  ): Promise<{ pkCargo: number }> {
    const sql = `
      INSERT INTO FK2_MGU_TB_CARGOS_ADMINISTRATIVOS (
        FK_TIPO_CARGO,
        FK_UTILIZADOR,
        ${dto.faculdadeId ? 'FK_FACULDADE,' : ''}
        ${dto.cursoId ? 'FK_CURSO,' : ''}
        ACTIVE,
        CREATED_AT,
        UPDATED_AT,
        CREATED_BY
      ) VALUES (
        ?, ?,
        ${dto.faculdadeId ? '?, ' : ''}${dto.cursoId ? '?, ' : ''}1,
        SYSDATE, SYSDATE, ?
      )
      RETURNING PK_CARGO INTO :pk_out
    `;

    const params = [
      dto.tipoCargoId,
      dto.utilizadorId,
      ...(dto.faculdadeId ? [dto.faculdadeId] : []),
      ...(dto.cursoId ? [dto.cursoId] : []),
      JSON.stringify({ pk: usuarioLogadoId, desc: 'usuário logado' }),
    ];

    const result = await queryRunner.manager.query(sql, params);
    return { pkCargo: result[0].pk_out };
  }

  private async adicionarAoGrupo(
    queryRunner: any,
    utilizadorId: number,
    grupoId: number,
    usuarioLogadoId: number,
  ): Promise<void> {
    const sql = `
      INSERT INTO FK2_MCA_TB_GRUPO_UTILIZADOR (
        FK_GRUPO,
        FK_UTILIZADOR,
        CREATED_AT,
        UPDATED_AT,
        CREATED_BY,
        LAST_UPDATED_BY,
        ACTIVE_STATE
      ) VALUES (?, ?, SYSDATE, SYSDATE, ?, ?, 1)
    `;

    await queryRunner.manager.query(sql, [
      grupoId,
      utilizadorId,
      JSON.stringify({ pk: usuarioLogadoId }),
      JSON.stringify({ pk: usuarioLogadoId }),
    ]);
  }

  private async permissaoReitor(
    queryRunner: any,
    utilizadorId: number,
    usuarioLogadoId: number,
  ): Promise<void> {
    const sqlCursos = `SELECT CODIGO FROM FK2_TB_CURSOS`;
    const cursos = await queryRunner.manager.query(sqlCursos);

    for (const curso of cursos) {
      await this.adicionarPermissaoCurso(queryRunner, utilizadorId, curso.CODIGO, usuarioLogadoId);
    }
  }

  private async permissaoDecanoOuCurso(
    queryRunner: any,
    dto: CreateCargoDto,
    usuarioLogadoId: number,
  ): Promise<void> {
    if (dto.tipoCargoId === this.CARGO_DECANO) {
      const sqlCursos = `SELECT CODIGO FROM FK2_TB_CURSOS WHERE FACULDADE_ID = ?`;
      const cursos = await queryRunner.manager.query(sqlCursos, [dto.faculdadeId]);

      for (const curso of cursos) {
        await this.adicionarPermissaoCurso(queryRunner, dto.utilizadorId, curso.CODIGO, usuarioLogadoId);
      }
    } else if (dto.cursoId) {
      await this.adicionarPermissaoCurso(queryRunner, dto.utilizadorId, dto.cursoId, usuarioLogadoId);
    }
  }

  private async adicionarPermissaoCurso(
    queryRunner: any,
    utilizadorId: number,
    cursoId: number,
    usuarioLogadoId: number,
  ): Promise<void> {
    const sql = `
      INSERT INTO FK2_TB_CURSO_PERMITIDO (
        CODIGO_UTILIZADOR,
        CURSO_ID,
        CANAL,
        CREATED_AT,
        UPDATED_AT
      ) VALUES (
        (SELECT CODIGO_IMPORTADO FROM FK2_MCA_TB_UTILIZADOR WHERE PK_UTILIZADOR = ?),
        ?,
        1,
        SYSDATE,
        SYSDATE
      )
    `;

    await queryRunner.manager.query(sql, [utilizadorId, cursoId]);
  }

  private async atualizarEntidadeFaculdadeOuCurso(
    queryRunner: any,
    dto: CreateCargoDto,
    usuarioLogadoId: number,
  ): Promise<void> {
    if (dto.tipoCargoId === this.CARGO_DECANO && dto.faculdadeId) {
      const [nome] = await queryRunner.manager.query(
        `SELECT NOME FROM FK2_MCA_TB_UTILIZADOR WHERE PK_UTILIZADOR = ?`,
        [dto.utilizadorId],
      );

      await queryRunner.manager.query(
        `
        UPDATE FK2_TB_FACULDADE
        SET DECANO = ?
        WHERE CODIGO = ?
        `,
        [nome?.NOME, dto.faculdadeId],
      );
    } else if (dto.tipoCargoId === this.CARGO_DIRECTOR && dto.cursoId) {
      await queryRunner.manager.query(
        `
        UPDATE FK2_TB_CURSOS
        SET CODIGO_DIRECTOR = ?
        WHERE CODIGO = ?
        `,
        [dto.utilizadorId, dto.cursoId],
      );
    } else if (dto.tipoCargoId === this.CARGO_COORDENADOR && dto.cursoId) {
      const [nome] = await queryRunner.manager.query(
        `SELECT NOME FROM FK2_MCA_TB_UTILIZADOR WHERE PK_UTILIZADOR = ?`,
        [dto.utilizadorId],
      );

      await queryRunner.manager.query(
        `
        UPDATE FK2_TB_CURSOS
        SET COORDENADOR = ?
        WHERE CODIGO = ?
        `,
        [nome?.NOME, dto.cursoId],
      );
    }
  }

  async alterarOcupante(
    pkCargo: number,
    novoUtilizadorId: number,
    usuarioLogadoId: number,
  ): Promise<{ message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const [existe] = await queryRunner.manager.query(
        `SELECT 1 FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS WHERE PK_CARGO = ? AND ACTIVE = 1`,
        [pkCargo],
      );

      if (!existe) {
        throw new NotFoundException('Cargo não encontrado ou inativo');
      }

      await queryRunner.manager.query(
        `
        UPDATE FK2_MGU_TB_CARGOS_ADMINISTRATIVOS
        SET FK_UTILIZADOR = ?,
            UPDATED_AT = SYSDATE,
            LAST_UPDATED_BY = ?
        WHERE PK_CARGO = ?
        `,
        [novoUtilizadorId, usuarioLogadoId, pkCargo],
      );

      await queryRunner.commitTransaction();

      return { message: 'Ocupante alterado com sucesso' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException('Falha ao alterar ocupante');
    } finally {
      await queryRunner.release();
    }
  }

  async removerOcupante(
    pkCargo: number,
    usuarioLogadoId: number,
  ): Promise<{ message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const [existe] = await queryRunner.manager.query(
        `SELECT 1 FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS WHERE PK_CARGO = ? AND ACTIVE = 1`,
        [pkCargo],
      );

      if (!existe) {
        throw new NotFoundException('Cargo não encontrado ou já inativo');
      }

      await queryRunner.manager.query(
        `
        UPDATE FK2_MGU_TB_CARGOS_ADMINISTRATIVOS
        SET ACTIVE = 0,
            UPDATED_AT = SYSDATE,
            LAST_UPDATED_BY = ?
        WHERE PK_CARGO = ?
        `,
        [usuarioLogadoId, pkCargo],
      );

      await queryRunner.commitTransaction();

      return { message: 'Ocupante removido com sucesso' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException('Falha ao remover ocupante');
    } finally {
      await queryRunner.release();
    }
  }

  private async verificarCargoJaDefinido(dto: CreateCargoDto): Promise<boolean> {
    let sql = `
      SELECT COUNT(*) AS COUNT
      FROM FK2_MGU_TB_CARGOS_ADMINISTRATIVOS C
      WHERE C.FK_TIPO_CARGO = ?
        AND C.ACTIVE = 1
    `;
    const params = [dto.tipoCargoId];

    if (dto.faculdadeId) {
      sql += ' AND C.FK_FACULDADE = ?';
      params.push(dto.faculdadeId);
    }
    if (dto.cursoId) {
      sql += ' AND C.FK_CURSO = ?';
      params.push(dto.cursoId);
    }

    try {
      const [row] = await this.dataSource.query(sql, params);
      return Number(row.COUNT) > 0;
    } catch (error) {
      throw new InternalServerErrorException('Erro na verificação de unicidade');
    }
  }
}