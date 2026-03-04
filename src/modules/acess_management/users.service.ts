

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
import oracledb from 'oracledb';
import { UserFilterDto } from './dto/user-filter.dto';
import { UserListItemDto } from './dto/user-list-item.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { gerarHashExterno } from '../util/hash.util';
import { FilterUserLogadoDto } from './dto/filter-user-logado.dto';
import { UpdatePersonUserDto } from './dto/update-person-user.dto';

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
  private async emailExiste(email: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `SELECT 1 FROM FK2_MCA_TB_UTILIZADOR WHERE LOWER(EMAIL) = LOWER('${email}') AND ROWNUM = 1`,
    );
    return result.length > 0;
  }
    private async emailExistePerson(email: string,pessoaId: number): Promise<boolean> {
    const result = await this.dataSource.query(
      `SELECT 1 FROM FK2_MCA_TB_UTILIZADOR WHERE LOWER(EMAIL) = LOWER('${email}') AND ROWNUM = 1 AND PK_UTILIZADOR !=${pessoaId}`,
    );
    return result.length > 0;
  }
    private async telefoneExistePerson(telefone: string,pessoaId: number): Promise<boolean> {
    const result = await this.dataSource.query(
      `SELECT 1 FROM FK2_TB_PESSOA WHERE (TELEFONE1 = '${telefone}' OR TELEFONE2 = '${telefone}') AND ROWNUM = 1 AND PK_PESSOA !=${pessoaId}`,
    );
    return result.length > 0;
  }
  private async telefoneExiste(telefone: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `SELECT 1 FROM FK2_TB_PESSOA WHERE TELEFONE1 = '${telefone}' OR TELEFONE2 = '${telefone}' AND ROWNUM = 1`,
    );
    return result.length > 0;
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
          pe.PK_PESSOA                             AS pessoaId,
        
          TO_CHAR(u.CREATED_AT, 'DD/MM/YYYY HH24:MI')   AS createdAt,
          TO_CHAR(u.UPDATED_AT, 'DD/MM/YYYY HH24:MI')   AS updatedAt,
          pe.NUM_DOC_IDENTIFICACAO                 AS numeroDocumento,
          TO_CHAR(pe.DATA_DE_NASCIMENTO, 'DD/MM/YYYY') AS dataDeNascimento,
          pe.TELEFONE1                             AS telefone1,
          pe.TELEFONE2                             AS telefone2,
          pe.FK_GENERO                                  AS genero,
          pe.FK_ESTADO_CIVIL                      AS estadoCivil,
          pe.FK_NACIONALIDADE                    AS nacionalidade
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
      data: await toLowerCaseKeys(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  async listUsersNoPagination(filter: UserFilterDto): Promise<{
    data: UserListItemDto[];
    total: number;
  }> {
    const { ativo, search } = filter;

    const params: any = {};

    let sql = `
    SELECT 
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

    // Ordenação
    sql += ` ORDER BY u.CREATED_AT DESC, u.NOME ASC`;

    const result = await this.dataSource.query(sql, params);

    const total = result.length;

    // Converter chaves para lower case (mesmo que antes)
    const data = result.map((row: any) => row);

    return {
      data: await toLowerCaseKeys(data),
      total,
    };
  }

  async addgroupToUser(
    userId: number,
    groupId: number,
    usuarioLogadoId: number,
  ): Promise<{ message: string }> {
    try {
      // 1. Verificar se a associação já existe
      const [existing] = await this.dataSource.query(`
      SELECT COUNT(*) as count 
      FROM FK2_MCA_TB_GRUPO_UTILIZADOR 
      WHERE FK_GRUPO = ${groupId} 
      AND FK_UTILIZADOR = ${userId}
    `);

      const alreadyExists = Number(existing.count) > 0;

      if (alreadyExists) {
        return {
          message: 'O utilizador já pertence a este grupo'
        };
      }

      // 2. Se não existe → inserir
      await this.dataSource.query(`
      INSERT INTO FK2_MCA_TB_GRUPO_UTILIZADOR (
        FK_GRUPO, 
        FK_UTILIZADOR, 
        ORDEM, 
        ACTIVE_STATE, 
        CREATED_AT, 
        UPDATED_AT
      ) VALUES (
        ${groupId}, 
        ${userId}, 
        1, 
        1, 
        SYSDATE, 
        SYSDATE
      )
    `);

      this.logger.log(
        `Grupo ${groupId} adicionado ao utilizador ${userId} por user_id=${usuarioLogadoId}`,
      );

      return {
        message: 'Grupo adicionado ao utilizador com sucesso'
      };

    } catch (error) {
      this.logger.error('Erro ao adicionar grupo ao utilizador', error.stack);

      // Tratamento mais específico para erro de duplicação (caso a constraint exista)
      if (error.code === 'ORA-00001') {
        return {
          message: 'O utilizador já pertence a este grupo'
        };
      }

      throw new InternalServerErrorException(
        'Erro interno ao adicionar grupo ao utilizador. Verifique os dados e tente novamente.'
      );
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
  async getLastGroupId(): Promise<number> {
    const sql = `
    SELECT MAX(PK_GRUPO) AS ultimo_id
    FROM FK2_MCA_TB_GRUPO
  `;

    const result = await this.dataSource.query(sql);

    // Se não houver registo → MAX retorna NULL → result[0].ULTIMO_ID é undefined/null
    const ultimoId = result?.[0]?.ULTIMO_ID;

    // Retorna próximo ID: se não existir nenhum → começa em 1
    return ultimoId != null ? Number(ultimoId) + 1 : 1;
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
      const emailExiste = await this.emailExiste(dto.email);
      if (emailExiste) {
        throw new ConflictException('Já existe um utilizador com este email.');
      }
      // 3. Inserir Pessoa



      if (dto.telefone1) {
        const telefone1Existe = await this.telefoneExiste(dto.telefone1);
        if (telefone1Existe) {
          throw new ConflictException('Já existe uma pessoa com este número de telefone.');
        }
      }
      if (dto.telefone2) {
        const telefone2Existe = await this.telefoneExiste(dto.telefone2);
        if (telefone2Existe) {
          throw new ConflictException('Já existe uma pessoa com este número de telefone.');
        }
      }
      await queryRunner.manager.query(`
  INSERT INTO FK2_TB_PESSOA (
    NOME_COMPLETO, 
    NUM_DOC_IDENTIFICACAO, 
    EMAIL,
    TELEFONE1, 
    TELEFONE2,
    DATA_DE_NASCIMENTO, 
    FK_TIPO_DOCUMENTO_IDENTIFICACAO,
    FK_GENERO, 
    FK_ESTADO_CIVIL, 
    FK_NACIONALIDADE,
    ACTIVE_STATE, 
    CREATED_AT, 
    UPDATED_AT
  ) VALUES (
    :nomeCompleto,
    :numDocIdentificacao,
    :email,
    :telefone1,
    :telefone2,
    :dataDeNascimento,
    :tipoDocumentoId,
    :sexoId,
    :estadoCivilId,
    :nacionalidadeId,
    1,
    SYSDATE,
    SYSDATE
  )
`, {
        nomeCompleto: dto.nomeCompleto || null,
        numDocIdentificacao: dto.numDocIdentificacao || null,
        email: dto.email || null,
        telefone1: dto.telefone1 || null,
        telefone2: dto.telefone2 || null,
        dataDeNascimento: dto.dataDeNascimento ? new Date(dto.dataDeNascimento) : null,
        tipoDocumentoId: dto.tipoDocumentoId || null,
        sexoId: dto.sexoId || null,
        estadoCivilId: dto.estadoCivilId || null,
        nacionalidadeId: dto.nacionalidadeId || null,
      } as any);

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


      pessoaId = Number(pessoaResult[0].ID);

      // 4. Gerar username único
      const baseUsername = this.gerarUsername(dto.nomeCompleto);
      username = await this.gerarUsernameUnico(baseUsername);

      // 5. Hash da senha temporária
      const senhaTemp = dto.numDocIdentificacao ;
      const senhaHash = await gerarHashExterno(senhaTemp);
      // 6. Inserir Utilizador

      await queryRunner.manager.query(`
        INSERT INTO FK2_MCA_TB_UTILIZADOR (
          USERNAME, NOME, PASSWORD, EMAIL,REF_PESSOA, ACTIVE_STATE, CREATED_AT, UPDATED_AT,PRIMEIRO_LOG
        ) VALUES (
          '${username}',
          '${dto.nomeCompleto.replace(/'/g, "''")}',
          '${senhaHash}',
           '${dto.email}',
          '${JSON.stringify({ pk: pessoaId, desc: dto.nomeCompleto })}',
          1,
          SYSDATE,
          SYSDATE,
          1
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

const result = await queryRunner.manager.query(
  `
  INSERT INTO FK2_MCA_TB_GRUPO (
    DESIGNACAO,
    SIGLA,
    DESCRICAO,
    FK_TIPO_DE_GRUPO,
    ORDEM,
    ACTIVE_STATE,
    CREATED_AT,
    UPDATED_AT
  ) VALUES (
    :username,
    :username,
    'Grupo unitário',
    2,
    1,
    1,
    SYSDATE,
    SYSDATE
  )
  RETURNING PK_GRUPO INTO :outId
  `,
  {
    username,
     outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
  } as any
);

    const grupoIdGerado = result.outId[0];
    console.log(result);
    
      const grupoResult = await queryRunner.manager.query(`
        SELECT PK_GRUPO AS id 
        FROM FK2_MCA_TB_GRUPO 
        WHERE DESIGNACAO = '${username}' 
        AND ROWNUM = 1
      `);

      if (!grupoResult || grupoResult.length === 0) {
        throw new InternalServerErrorException('Falha ao recuperar o grupo recém-criado.');
      }


      // 8. Associar utilizador ao grupo
      await queryRunner.manager.query(`
        INSERT INTO FK2_MCA_TB_GRUPO_UTILIZADOR (
          FK_GRUPO, FK_UTILIZADOR, ORDEM, ACTIVE_STATE, CREATED_AT, UPDATED_AT
        ) VALUES (
          ${grupoIdGerado}, ${utilizadorId}, 1, 1, SYSDATE, SYSDATE
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
        observacao: 'O usuário deve alterar a senha no primeiro login.'


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
async editarPessoaEUtilizador(
  pessoaId: number,
  dto: UpdatePersonUserDto, 
  usuarioLogadoId: number = 1,
): Promise<CreatePersonUserResponseDto> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Verificar se a pessoa existe
    const pessoaExiste = await queryRunner.manager.query(
      `SELECT 1 FROM FK2_TB_PESSOA WHERE PK_PESSOA = :pessoaId AND ROWNUM = 1`,
      [pessoaId],
    );
    if (!pessoaExiste || pessoaExiste.length === 0) {
      throw new NotFoundException('Pessoa não encontrada.');
    }

    // 2. Validar email se for fornecido
    if (dto.email) {
      if (!this.validarEmail(dto.email)) {
        throw new BadRequestException('Endereço de email inválido.');
      }
      const emailExiste = await this.emailExistePerson(dto.email, pessoaId);
      if (emailExiste) {
        throw new ConflictException('Já existe outro utilizador com este email.');
      }
    }

    // 3. Validar telefones se forem fornecidos
    if (dto.telefone1) {
      const telefone1Existe = await this.telefoneExistePerson(dto.telefone1, pessoaId);
      if (telefone1Existe) {
        throw new ConflictException('Já existe outra pessoa com este número de telefone.');
      }
    }
    if (dto.telefone2) {
      const telefone2Existe = await this.telefoneExistePerson(dto.telefone2, pessoaId);
      if (telefone2Existe) {
        throw new ConflictException('Já existe outra pessoa com este número de telefone.');
      }
    }

    // 4. Atualizar Pessoa
    await queryRunner.manager.query(
      `
      UPDATE FK2_TB_PESSOA
      SET
        NOME_COMPLETO = NVL(:nomeCompleto, NOME_COMPLETO),
        NUM_DOC_IDENTIFICACAO = NVL(:numDocIdentificacao, NUM_DOC_IDENTIFICACAO),
        EMAIL = NVL(:email, EMAIL),
        TELEFONE1 = NVL(:telefone1, TELEFONE1),
        TELEFONE2 = NVL(:telefone2, TELEFONE2),
        DATA_DE_NASCIMENTO = NVL(:dataDeNascimento, DATA_DE_NASCIMENTO),
        FK_TIPO_DOCUMENTO_IDENTIFICACAO = NVL(:tipoDocumentoId, FK_TIPO_DOCUMENTO_IDENTIFICACAO),
        FK_GENERO = NVL(:sexoId, FK_GENERO),
        FK_ESTADO_CIVIL = NVL(:estadoCivilId, FK_ESTADO_CIVIL),
        FK_NACIONALIDADE = NVL(:nacionalidadeId, FK_NACIONALIDADE),
        UPDATED_AT = SYSDATE
      WHERE PK_PESSOA = :pessoaId
      `,
      {
        pessoaId,
        nomeCompleto: dto.nomeCompleto || null,
        numDocIdentificacao: dto.numDocIdentificacao || null,
        email: dto.email || null,
        telefone1: dto.telefone1 || null,
        telefone2: dto.telefone2 || null,
        dataDeNascimento: dto.dataDeNascimento ? new Date(dto.dataDeNascimento) : null,
        tipoDocumentoId: dto.tipoDocumentoId || null,
        sexoId: dto.sexoId || null,
        estadoCivilId: dto.estadoCivilId || null,
        nacionalidadeId: dto.nacionalidadeId || null,
      } as any,
    );

    // 5. Recuperar ID do Utilizador ""
    const utilizadorResult = await queryRunner.manager.query(
      `SELECT PK_UTILIZADOR AS id, USERNAME FROM FK2_MCA_TB_UTILIZADOR WHERE 
      JSON_VALUE(REF_PESSOA, '$.pk' RETURNING NUMBER) = :pessoaId
       AND ROWNUM = 1`,
      [pessoaId],
    );
    if (!utilizadorResult || utilizadorResult.length === 0) {
      throw new InternalServerErrorException('Utilizador associado à pessoa não encontrado.');
    }
    const utilizadorId = Number(utilizadorResult[0].ID);
    let username = utilizadorResult[0].USERNAME;

    // 6. Atualizar Utilizador
    await queryRunner.manager.query(
      `
      UPDATE FK2_MCA_TB_UTILIZADOR
      SET
        NOME = NVL(:nomeCompleto, NOME),
        EMAIL = NVL(:email, EMAIL),
        UPDATED_AT = SYSDATE
      WHERE PK_UTILIZADOR = :utilizadorId
      `,
      {
        utilizadorId,
        nomeCompleto: dto.nomeCompleto || null,
        email: dto.email || null,
      } as any,
    );

    this.logger.log(
      `Utilizador atualizado com sucesso: ${dto.nomeCompleto || username} | user_id=${usuarioLogadoId}`,
    );

    await queryRunner.commitTransaction();

    return {
      message: 'Utilizador atualizado com sucesso',
      username,
      senhaTemporariaGerada: false,
      observacao: 'Os dados do utilizador foram atualizados com sucesso.',
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    this.logger.error('Erro ao atualizar utilizador', error.stack);

    if (
      error instanceof ConflictException ||
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }
    throw new InternalServerErrorException(
      'Erro interno ao atualizar utilizador. Verifique os dados e tente novamente.',
    );
  } finally {
    await queryRunner.release();
  }
}

  async listUsersAcesso(filter: FilterUserLogadoDto): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 25,
      search,
      estado = 1,
    } = filter;

    const offset = (page - 1) * limit;

    // Params comuns (usados na query de dados)
    const params: Record<string, any> = {
      offset,
      limit_plus_offset: offset + limit,
    };

    // Params só para count (vamos adicionar só o que for necessário)
    let countParams: Record<string, any> = {};

    let whereClause = `WHERE 1 = 1`;

    if (estado === 1) {
      whereClause += ` AND ca.LOGADO = 1`;
    } else if (estado === 0) {
      whereClause += ` AND ca.LOGADO = 0`;
    }
    // estado 2 → sem filtro

    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toUpperCase()}%`;
      whereClause += `
      AND (
        UPPER(u.NOME)           LIKE :search
        OR UPPER(u.USERNAME)    LIKE :search
        OR UPPER(u.EMAIL)       LIKE :search
        OR UPPER(ca.IP)         LIKE :search
        OR TO_CHAR(ca.CODIGOUTILIZADOR) LIKE :search
      )`;
      // Adiciona :search tanto no count como na data
      params.search = searchTerm;
      countParams.search = searchTerm;
    }

    // Query de contagem → sem offset/limit
    const countSql = `
    SELECT COUNT(*) AS total
    FROM FK2_TB_CONTROLE_ACESSO_UTILIZADOR ca
    INNER JOIN FK2_MCA_TB_UTILIZADOR u ON u.PK_UTILIZADOR = ca.CODIGOUTILIZADOR
    LEFT JOIN FK2_TB_PESSOA pe ON pe.pk_pessoa = JSON_VALUE(u.REF_PESSOA, '$.pk')
    ${whereClause}
  `;

    // Executa count com APENAS os binds necessários
    const countResult = await this.dataSource.query(countSql, countParams as any);
    const total = Number(countResult[0]?.TOTAL ?? 0);

    // Query de dados paginada
    const dataSql = `
    SELECT *
    FROM (
      SELECT
        ca.CODIGO                                   AS codigo,
        u.NOME                                       AS nome,
        u.USERNAME                                   AS username,
        u.EMAIL                                      AS email,
        ca.IP                                        AS ip,
        TO_CHAR(ca.DATA, 'DD/MM/YYYY HH24:MI:SS')    AS ultimaAtividade,
        ca.LOGADO                                    AS logado,
        u.PK_UTILIZADOR                              AS utilizador,
        ROW_NUMBER() OVER (ORDER BY ca.DATA DESC) AS  rn
      FROM FK2_TB_CONTROLE_ACESSO_UTILIZADOR ca
      INNER JOIN FK2_MCA_TB_UTILIZADOR u ON u.PK_UTILIZADOR = ca.CODIGOUTILIZADOR
      LEFT JOIN FK2_TB_PESSOA pe ON pe.pk_pessoa = JSON_VALUE(u.REF_PESSOA, '$.pk')
      ${whereClause}
    ) t
    WHERE rn BETWEEN (:offset + 1) AND :limit_plus_offset
    ORDER BY rn
  `;

    const result = await this.dataSource.query(dataSql, params as any);

    const data = result.map((row: any) => {
      const { RN, ...item } = row;
      return item;
    });




    return {
      data: await toLowerCaseKeys(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }


}