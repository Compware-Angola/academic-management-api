import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import * as oracledb from 'oracledb';
import {
  CriarDocenteCompletoDto,
  CriarDocenteCompletoResponseDto,
} from './dto/create-docente-completo.dto';
import { gerarHashExterno } from '../util/hash.util';

@Injectable()
export class DocenteService {
  private readonly logger = new Logger(DocenteService.name);

  constructor(private readonly dataSource: DataSource) {}

  async criarDocenteCompleto(
    dto: CriarDocenteCompletoDto,
    usuarioLogadoId: number = 1,
  ): Promise<CriarDocenteCompletoResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ---------- 1. Validações de Pessoa ----------
      const docExiste = await queryRunner.manager.query(
        `SELECT 1 FROM FK2_TB_PESSOA WHERE NUM_DOC_IDENTIFICACAO = :doc AND ROWNUM = 1`,
        { doc: dto.pessoa.numDocIdentificacao } as any,
      );
      if (docExiste.length > 0) {
        throw new ConflictException(
          'Já existe uma pessoa com este número de documento.',
        );
      }

      if (!this.validarEmail(dto.pessoa.email)) {
        throw new BadRequestException('Endereço de email inválido.');
      }
      if (await this.emailExiste(queryRunner, dto.pessoa.email)) {
        throw new ConflictException('Já existe um utilizador com este email.');
      }
      if (
        dto.pessoa.telefone1 &&
        (await this.telefoneExiste(queryRunner, dto.pessoa.telefone1))
      ) {
        throw new ConflictException(
          'Já existe uma pessoa com este número de telefone.',
        );
      }
      if (
        dto.pessoa.telefone2 &&
        (await this.telefoneExiste(queryRunner, dto.pessoa.telefone2))
      ) {
        throw new ConflictException(
          'Já existe uma pessoa com este número de telefone.',
        );
      }

      // ---------- 2. Inserir Pessoa ----------
      const pessoaResult = await queryRunner.manager.query(
        `
  INSERT INTO FK2_TB_PESSOA (
    NOME_COMPLETO, NOME_DO_PAI, NOME_DA_MAE, DATA_DE_NASCIMENTO,
    NUM_DOC_IDENTIFICACAO, FK_TIPO_DOCUMENTO_IDENTIFICACAO,
    DATA_DE_EMISSAO_DOCUMENTO, DATA_DE_EXPIRACAO_DOCUMENTO,
    FK_GENERO, FK_NACIONALIDADE, ENDERECO, FK_NATURALIDADE,
    FK_ESTADO_CIVIL, TELEFONE1, TELEFONE2, EMAIL,
    CREATED_BY, LAST_UPDATED_BY, ACTIVE_STATE, CREATED_AT, UPDATED_AT
  ) VALUES (
    :nomeCompleto, :nomePai, :nomeMae, :dataDeNascimento,
    :numDocIdentificacao, :tipoDocumentoId,
    :dataDeEmissaoDocumento, :dataDeExpiracaoDocumento,
    :sexoId, :nacionalidadeId, :endereco, :naturalidadeId,
    :estadoCivilId, :telefone1, :telefone2, :email,
    :createdBy, :lastUpdatedBy, 1, SYSDATE, SYSDATE
  )
  RETURNING PK_PESSOA INTO :outId
  `,
        {
          nomeCompleto: dto.pessoa.nomeCompleto,
          nomePai: dto.pessoa.nomePai,
          nomeMae: dto.pessoa.nomeMae,
          dataDeNascimento: dto.pessoa.dataDeNascimento
            ? new Date(dto.pessoa.dataDeNascimento)
            : null,
          numDocIdentificacao: dto.pessoa.numDocIdentificacao,
          tipoDocumentoId: dto.pessoa.tipoDocumentoId || null,
          dataDeEmissaoDocumento: dto.pessoa.dataDeEmissaoDocumento
            ? new Date(dto.pessoa.dataDeEmissaoDocumento)
            : null,
          dataDeExpiracaoDocumento: dto.pessoa.dataDeExpiracaoDocumento
            ? new Date(dto.pessoa.dataDeExpiracaoDocumento)
            : null,
          sexoId: dto.pessoa.sexoId || null,
          nacionalidadeId: dto.pessoa.nacionalidadeId || null,
          endereco: dto.pessoa.endereco || null,
          naturalidadeId: dto.pessoa.naturalidadeId || null,
          estadoCivilId: dto.pessoa.estadoCivilId || null,
          telefone1: dto.pessoa.telefone1 || null,
          telefone2: dto.pessoa.telefone2 || null,
          email: dto.pessoa.email,
          createdBy: usuarioLogadoId, // vem do req.user.id (JWT), não do DTO
          lastUpdatedBy: usuarioLogadoId,
          outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        } as any,
      );
      const pessoaId = Number(pessoaResult.outId[0]);

      // ---------- 3. Inserir Utilizador ----------
      const baseUsername = this.gerarUsername(dto.pessoa.nomeCompleto);
      const username = await this.gerarUsernameUnico(queryRunner, baseUsername);
      const senhaHash = await gerarHashExterno(dto.pessoa.numDocIdentificacao);

      const utilizadorResult = await queryRunner.manager.query(
        `
        INSERT INTO FK2_MCA_TB_UTILIZADOR (
          USERNAME, NOME, PASSWORD, EMAIL, REF_PESSOA, ACTIVE_STATE,
          CREATED_AT, UPDATED_AT, PRIMEIRO_LOG
        ) VALUES (
          :username, :nome, :senha, :email, :refPessoa, 1, SYSDATE, SYSDATE, 1
        )
        RETURNING PK_UTILIZADOR INTO :outId
        `,
        {
          username,
          nome: dto.pessoa.nomeCompleto,
          senha: senhaHash,
          email: dto.pessoa.email,
          refPessoa: JSON.stringify({
            pk: pessoaId,
            desc: dto.pessoa.nomeCompleto,
          }),
          outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        } as any,
      );
      const utilizadorId = Number(utilizadorResult.outId[0]);

      // ---------- 4. Criar Grupo unitário ----------
      const grupoResult = await queryRunner.manager.query(
        `
        INSERT INTO FK2_MCA_TB_GRUPO (
          DESIGNACAO, SIGLA, DESCRICAO, FK_TIPO_DE_GRUPO, ORDEM, ACTIVE_STATE,
          CREATED_AT, UPDATED_AT
        ) VALUES (:username, :username, 'Grupo unitário', 2, 1, 1, SYSDATE, SYSDATE)
        RETURNING PK_GRUPO INTO :outId
        `,
        {
          username,
          outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        } as any,
      );
      const grupoId = Number(grupoResult.outId[0]);

      await queryRunner.manager.query(
        `
        INSERT INTO FK2_MCA_TB_GRUPO_UTILIZADOR (
          FK_GRUPO, FK_UTILIZADOR, ORDEM, ACTIVE_STATE, CREATED_AT, UPDATED_AT
        ) VALUES (:grupoId, :utilizadorId, 1, 1, SYSDATE, SYSDATE)
        `,
        { grupoId, utilizadorId } as any,
      );

      // ---------- 5. Inserir Candidatura ----------
      const candidaturaResult = await queryRunner.manager.query(
        `
        INSERT INTO FK2_MGD_TB_CANDIDATURA (
          APRECIACAO, GRAU_ACADEMICO, FK_PESSOA, DATA_CANDIDATURA, CANAL,
          CODIGO_MOTIVO, FK_ESTADO_CANDIDATURA, FACULDADE,
          DATA_INICIO_EXPERIENCIA, DATA_FIM_EXPERIENCIA
        ) VALUES (
          :apreciacao, :grauAcademico, :fkPessoa, SYSDATE, :canal,
          :codigoMotivo, :fkEstadoCandidatura, :faculdade,
          :dataInicioExperiencia, :dataFimExperiencia
        )
        RETURNING CODIGO INTO :outId
        `,
        {
          apreciacao: dto.candidatura.apreciacao || null,
          grauAcademico: dto.candidatura.grauAcademico || null,
          fkPessoa: JSON.stringify({
            pk_pessoa: pessoaId,
            nome_completo: dto.pessoa.nomeCompleto,
          }),
          canal: dto.candidatura.canal || null,
          codigoMotivo: dto.candidatura.codigoMotivo || null,
          fkEstadoCandidatura: dto.candidatura.fkEstadoCandidatura || null,
          faculdade: dto.candidatura.faculdade || null,
          dataInicioExperiencia: dto.candidatura.dataInicioExperiencia
            ? new Date(dto.candidatura.dataInicioExperiencia)
            : null,
          dataFimExperiencia: dto.candidatura.dataFimExperiencia
            ? new Date(dto.candidatura.dataFimExperiencia)
            : null,
          outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        } as any,
      );
      const candidaturaId = Number(candidaturaResult.outId[0]);

      // ---------- 6. Inserir Docente ----------
      const docenteResult = await queryRunner.manager.query(
        `
        INSERT INTO FK2_MGD_TB_DOCENTE (
          APRECIACAO, CODIGO_UTILIZADOR, FK_ESCALAO, TB_CATEGORIA_DOCENTE, N_MECANOGRAFICO,
          FACULDADE, VALOR_HORA, FK_CANDIDATURA, TOTAL_ANO_EXPERIENCIA,
          DATAINICIODOCENCIA, PROPOSTA_DE_CONTRATACAO, COD_CONTRATO,
          CREATED_AT, UPDATED_AT
        ) VALUES (
          :apreciacao, :codigoUtilizador, :fkEscalao, :tbCategoriaDocente, :mecanografico,
          :faculdade, :valorHora, :fkCandidatura, :totalAnoExperiencia,
          :dataInicioDocencia, :propostaDeContratacao, :codContrato,
          SYSDATE, SYSDATE
        )
        RETURNING CODIGO INTO :outId
        `,
        {
          apreciacao: dto.docente.apreciacao || null,
          codigoUtilizador: JSON.stringify({
            pk: utilizadorId,
            desc: dto.pessoa.nomeCompleto,
          }),
          fkEscalao: dto.docente.fkEscalao || null,
          tbCategoriaDocente: dto.docente.tbCategoriaDocente || null,
          mecanografico: dto.docente.mecanografico || null,
          faculdade: dto.docente.faculdade || null,
          valorHora: dto.docente.valorHora || null,
          fkCandidatura: candidaturaId,
          totalAnoExperiencia: dto.docente.totalAnoExperiencia || null,
          dataInicioDocencia: dto.docente.dataInicioDocencia
            ? new Date(dto.docente.dataInicioDocencia)
            : null,
          propostaDeContratacao: dto.docente.propostaDeContratacao || null,
          codContrato: dto.docente.codContrato || null,
          outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        } as any,
      );
      const docenteId = Number(docenteResult.outId[0]);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Docente criado com sucesso: ${dto.pessoa.nomeCompleto} | codigo=${docenteId} | Por: user_id=${usuarioLogadoId}`,
      );

      return {
        message: 'Docente cadastrado com sucesso',
        pessoaId,
        utilizadorId,
        candidaturaId,
        docenteId,
        username,
        senhaTemporariaGerada: true,
        observacao: 'O docente deve alterar a senha no primeiro login.',
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Erro ao criar docente completo', error.stack);

      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Erro interno ao cadastrar docente. Verifique os dados e tente novamente.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ---------- Helpers (reimplementados de forma independente) ----------

  private validarEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private async emailExiste(
    queryRunner: QueryRunner,
    email: string,
  ): Promise<boolean> {
    const result = await queryRunner.manager.query(
      `SELECT 1 FROM FK2_MCA_TB_UTILIZADOR WHERE EMAIL = :email AND ROWNUM = 1`,
      { email } as any,
    );
    return result.length > 0;
  }

  private async telefoneExiste(
    queryRunner: QueryRunner,
    telefone: string,
  ): Promise<boolean> {
    const result = await queryRunner.manager.query(
      `SELECT 1 FROM FK2_TB_PESSOA WHERE (TELEFONE1 = :tel OR TELEFONE2 = :tel) AND ROWNUM = 1`,
      { tel: telefone } as any,
    );
    return result.length > 0;
  }

  private gerarUsername(nomeCompleto: string): string {
    const partes = nomeCompleto.trim().toLowerCase().split(/\s+/);
    const primeiro = partes[0] || '';
    const ultimo = partes.length > 1 ? partes[partes.length - 1] : '';
    return this.removerAcentos(`${primeiro}.${ultimo}`);
  }

  private async gerarUsernameUnico(
    queryRunner: QueryRunner,
    base: string,
  ): Promise<string> {
    let candidato = base;
    let contador = 0;
    while (true) {
      const result = await queryRunner.manager.query(
        `SELECT 1 FROM FK2_MCA_TB_UTILIZADOR WHERE USERNAME = :username AND ROWNUM = 1`,
        { username: candidato } as any,
      );
      if (result.length === 0) return candidato;
      contador++;
      candidato = `${base}${contador}`;
    }
  }

  private removerAcentos(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}
