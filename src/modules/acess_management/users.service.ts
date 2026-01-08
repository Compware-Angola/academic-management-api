

import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreatePersonUserDto } from './dto/create-person-user.dto';
import { CreatePersonUserResponseDto } from './dto/create-person-user-response.dto';

import { UserFilterDto } from './dto/user-filter.dto';
import { UserListItemDto } from './dto/user-list-item.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { gerarHashExterno } from '../util/hash.util';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly dataSource: DataSource) { }

  private gerarUsername(nomeCompleto: string): string {
    const partes = nomeCompleto.trim().split(/\s+/);
    const primeiro = partes[0]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const ultimo = partes[partes.length - 1]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return `${primeiro}.${ultimo}`;
  }

  private async gerarUsernameUnico(base: string): Promise<string> {
    let username = base;
    let contador = 0;

    while (true) {
      const existe = await this.dataSource.query(
        `SELECT 1 FROM FK2_MCA_TB_UTILIZADOR WHERE LOWER(USERNAME) = LOWER('${username}') AND ROWNUM = 1`,
      );
      if (existe.length === 0) return username;
      username = `${base}${contador}`;
      contador++;
    }
  }

  private validarEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  async updatePassword(dto: UpdatePasswordDto, usuarioLogadoId: number): Promise<{ message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verifica se o utilizador existe
      const [user] = await queryRunner.manager.query(
        `SELECT 1 FROM FK2_MCA_TB_UTILIZADOR WHERE PK_UTILIZADOR = ${dto.utilizadorId} AND ROWNUM = 1`
      );

      if (!user) {
        throw new NotFoundException('Utilizador não encontrado');
      }

      // Gera o hash da nova senha
      // Opção 1: bcrypt local
      const hashedPassword: string = await gerarHashExterno(dto.novaSenha);

      // Opção 2: se quiser usar o serviço externo de hash
      // const hashedPassword = await this.hashUtil.gerarHash(dto.novaSenha);

      await queryRunner.manager.query(`
      UPDATE FK2_MCA_TB_UTILIZADOR
      SET 
        PASSWORD = '${hashedPassword}',
        LAST_PASSWORD_CHANGE = SYSDATE,
        LAST_UPDATED_BY = ${usuarioLogadoId},
        UPDATED_AT = SYSDATE
      WHERE PK_UTILIZADOR = ${dto.utilizadorId}
    `);

      await queryRunner.commitTransaction();

      return { message: 'Senha atualizada com sucesso' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

async listUsers(filter: UserFilterDto): Promise<{
  data: UserListItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const {
    ativo,
    page = 1,
    limit = 20, 
    search
  } = filter;


    const offset = (page - 1) * limit;
 
  const params: any = {
    offset,
    limit: offset + limit, 
  };

let sql = `
    SELECT *
    FROM (
      SELECT
        dados.*,
        ROW_NUMBER() OVER (ORDER BY dados.createdAt DESC, dados.nome ASC) AS rn,
        COUNT(*) OVER () AS total_registros
      FROM (
        SELECT DISTINCT
          u.PK_UTILIZADOR                          AS codigo,
          u.NOME                                   AS nome,
          u.USERNAME                               AS username,
          u.EMAIL                                  AS email,
          u.ACTIVE_STATE                           AS activeState,
          u.OBS                                    AS obs,
        
          TO_CHAR(u.CREATED_AT, 'DD/MM/YYYY HH24:MI')   AS createdAt,
          TO_CHAR(u.UPDATED_AT, 'DD/MM/YYYY HH24:MI')   AS updatedAt,
          pe.NUM_DOC_IDENTIFICACAO                 AS numeroDocumento,
          TO_CHAR(pe.DATA_DE_NASCIMENTO, 'DD/MM/YYYY') AS dataDeNascimento,
          pe.TELEFONE1                             AS telefone1,
          pe.TELEFONE2                             AS telefone2
        FROM FK2_MCA_TB_UTILIZADOR u
        LEFT JOIN FK2_TB_PESSOA pe 
          ON pe.pk_pessoa = JSON_VALUE(u.REF_PESSOA, '$.pk')
        WHERE 1 = 1
  `;
  // Filtro ativo/inativo
  if (ativo === 'true') {
    sql += ` AND u.ACTIVE_STATE = 1`;
  } else if (ativo === 'false') {
    sql += ` AND u.ACTIVE_STATE = 0`;
  }

  // Filtro de pesquisa livre (nome, username ou email)
  if (search && search.trim()) {
    const searchTerm = `%${search.trim().toUpperCase()}%`;
    sql += `
      AND (
        UPPER(u.NOME) LIKE :search
        OR UPPER(u.USERNAME) LIKE :search
        OR UPPER(u.EMAIL) LIKE :search
      )
    `;
    params.search = searchTerm;
  }

  // Fechar subqueries
  sql += `
      ) dados
    )
  WHERE rn > :offset
      AND rn <= :limit
    ORDER BY rn
  `;

  const result = await this.dataSource.query(sql, params);

  const total = result.length > 0 ? Number(result[0].TOTAL_REGISTROS) : 0;

  // Remover colunas internas rn e total_registros
  const data = result.map((row: any) => {
    const { RN, TOTAL_REGISTROS, ...item } = row;
    return item;
  });

  return {
    data: await toLowerCaseKeys(data) ,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
async  addgroupToUser(
    userId: number,
    groupId: number,
    usuarioLogadoId: number,
  ): Promise<{ message: string }> {
    try {
      await this.dataSource.query(`
        INSERT INTO FK2_MCA_TB_GRUPO_UTILIZADOR (
          FK_GRUPO, FK_UTILIZADOR, ORDEM, ACTIVE_STATE, CREATED_AT, UPDATED_AT
        ) VALUES (
          ${groupId}, ${userId}, 1, 1, SYSDATE, SYSDATE
        )
      `);

      this.logger.log(
        `Grupo ${groupId} adicionado ao utilizador ${userId} por user_id=${usuarioLogadoId}`,
      );

      return { message: 'Grupo adicionado ao utilizador com sucesso' };
    } catch (error) {
      this.logger.error('Erro ao adicionar grupo ao utilizador', error.stack);
      throw new InternalServerErrorException('Erro interno ao adicionar grupo ao utilizador. Verifique os dados e tente novamente.');
    }
  }

  async removeGroupFromUser(
    userId: number,
    groupId: number,
    usuarioLogadoId: number,
  ): Promise<{ message: string }> {
    try {
      await this.dataSource.query(`
        DELETE FROM FK2_MCA_TB_GRUPO_UTILIZADOR
        WHERE FK_GRUPO = ${groupId}
          AND FK_UTILIZADOR = ${userId}
      `);

      this.logger.log(
        `Grupo ${groupId} removido do utilizador ${userId} por user_id=${usuarioLogadoId}`,
      );

      return { message: 'Grupo removido do utilizador com sucesso' };
    } catch (error) {
      this.logger.error('Erro ao remover grupo do utilizador', error.stack);
      throw new InternalServerErrorException('Erro interno ao remover grupo do utilizador. Verifique os dados e tente novamente.');
    }
  }
  async criarPessoaEUtilizador(
    dto: CreatePersonUserDto,
    usuarioLogadoId: number = 1,
  ): Promise<CreatePersonUserResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let pessoaId: number;
    let utilizadorId: number;
    let grupoId: number;
    let username: string;

    try {
      // 1. Validar documento único
      const docExiste = await queryRunner.manager.query(
        `SELECT 1 FROM FK2_TB_PESSOA WHERE NUM_DOC_IDENTIFICACAO = '${dto.numDocIdentificacao}' AND ROWNUM = 1`,
      );
      if (docExiste.length > 0) {
        throw new ConflictException('Já existe uma pessoa com este número de documento.');
      }

      // 2. Validar email
      if (!this.validarEmail(dto.email)) {
        throw new BadRequestException('Endereço de email inválido.');
      }

      // 3. Inserir Pessoa
      await queryRunner.manager.query(`
        INSERT INTO FK2_TB_PESSOA (
          NOME_COMPLETO, NUM_DOC_IDENTIFICACAO, EMAIL,
          TELEFONE1, TELEFONE2,
          DATA_DE_NASCIMENTO, FK_TIPO_DOCUMENTO_IDENTIFICACAO,
          FK_GENERO, FK_ESTADO_CIVIL, FK_NACIONALIDADE,
          ACTIVE_STATE, CREATED_AT, UPDATED_AT
        ) VALUES (
          '${dto.nomeCompleto.replace(/'/g, "''")}',
          '${dto.numDocIdentificacao}',
          '${dto.email}',
          '${dto.telefone1 || ''}',
          '${dto.telefone2 || ''}',
          ${dto.dataDeNascimento ? `TO_DATE('${dto.dataDeNascimento}', 'YYYY-MM-DD')` : 'NULL'},
          ${dto.tipoDocumentoId},
          ${dto.sexoId},
          ${dto.estadoCivilId},
          ${dto.nacionalidadeId},
          1,
          SYSDATE,
          SYSDATE
        )
      `);

      // Recuperar ID da pessoa
      const pessoaResult = await queryRunner.manager.query(`
        SELECT PK_PESSOA AS id 
        FROM FK2_TB_PESSOA 
        WHERE NUM_DOC_IDENTIFICACAO = '${dto.numDocIdentificacao}' 
        AND ROWNUM = 1
      `);

      if (!pessoaResult || pessoaResult.length === 0) {
        throw new InternalServerErrorException('Falha ao recuperar a pessoa recém-criada.');
      }
      pessoaId = Number(pessoaResult[0].id);

      // 4. Gerar username único
      const baseUsername = this.gerarUsername(dto.nomeCompleto);
      username = await this.gerarUsernameUnico(baseUsername);

      // 5. Hash da senha temporária
      //const senhaTemp = Math.random().toString(36).slice(-8) + 'A1@';
      const senhaHash = await gerarHashExterno("compware123")

      // 6. Inserir Utilizador
      await queryRunner.manager.query(`
        INSERT INTO FK2_MCA_TB_UTILIZADOR (
          USERNAME, NOME, PASSWORD, REF_PESSOA, ACTIVE_STATE, CREATED_AT, UPDATED_AT
        ) VALUES (
          '${username}',
          '${dto.nomeCompleto.replace(/'/g, "''")}',
          '${senhaHash}',
          '${JSON.stringify({ personId: pessoaId, personName: dto.nomeCompleto })}',
          1,
          SYSDATE,
          SYSDATE
        )
      `);

      const utilizadorResult = await queryRunner.manager.query(`
        SELECT PK_UTILIZADOR AS id 
        FROM FK2_MCA_TB_UTILIZADOR 
        WHERE USERNAME = '${username}' 
        AND ROWNUM = 1
      `);

      if (!utilizadorResult || utilizadorResult.length === 0) {
        throw new InternalServerErrorException('Falha ao recuperar o utilizador recém-criado.');
      }
      utilizadorId = Number(utilizadorResult[0].ID);

      // 7. Criar Grupo Unitário
      await queryRunner.manager.query(`
        INSERT INTO FK2_MCA_TB_GRUPO (
          DESIGNACAO, SIGLA, DESCRICAO, FK_TIPO_DE_GRUPO, ORDEM, ACTIVE_STATE, CREATED_AT, UPDATED_AT
        ) VALUES (
          '${username}', '${username}', 'Grupo unitário', 2, 1, 1, SYSDATE, SYSDATE
        )
      `);

      const grupoResult = await queryRunner.manager.query(`
        SELECT PK_GRUPO AS id 
        FROM FK2_MCA_TB_GRUPO 
        WHERE DESIGNACAO = '${username}' 
        AND ROWNUM = 1
      `);

      if (!grupoResult || grupoResult.length === 0) {
        throw new InternalServerErrorException('Falha ao recuperar o grupo recém-criado.');
      }
      grupoId = Number(grupoResult[0].ID);

      // 8. Associar utilizador ao grupo
      await queryRunner.manager.query(`
        INSERT INTO FK2_MCA_TB_GRUPO_UTILIZADOR (
          FK_GRUPO, FK_UTILIZADOR, ORDEM, ACTIVE_STATE, CREATED_AT, UPDATED_AT
        ) VALUES (
          ${grupoId}, ${utilizadorId}, 1, 1, SYSDATE, SYSDATE
        )
      `);

      // 9. Log de sucesso
      this.logger.log(
        `Utilizador criado com sucesso: ${dto.nomeCompleto} | Username: ${username} | Por: user_id=${usuarioLogadoId}`,
      );

      await queryRunner.commitTransaction();

      return {
        message: 'Utilizador cadastrado com sucesso',
        username,
        senhaTemporariaGerada: true,
        observacao: 'O usuário deve alterar a senha no primeiro login.',
        // senhaTemp, // NUNCA retorne a senha em produção! Só para teste local.
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Erro ao criar utilizador', error.stack);

      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Erro interno ao cadastrar utilizador. Verifique os dados e tente novamente.');
    } finally {
      await queryRunner.release();
    }
  }
}