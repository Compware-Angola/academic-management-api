import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as oracledb from 'oracledb';
import { CreatePreRegistrationDto } from './dto/create-pre-inscricao.dto';
import { UpdatePreRegistrationDto } from './dto/update-pre-inscricao.dto';
import { QueryPreRegistrationDto } from './dto/queryPreRegistrationDto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';


@Injectable()
export class PreRegistrationService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    // ─────────────────────────────────────────────
    //  CREATE
    // ─────────────────────────────────────────────
    async create(dto: CreatePreRegistrationDto, userId: number) {
        await this.assertUniqueBI(dto.bilheteIdentidade);
        await this.assertUniqueEmail(dto.email);

        const result = await this.dataSource.query(
            `
        INSERT INTO FK2_TB_PREINSCRICAO (
            CURSO_CANDIDATURA,
            MODALIDADE_FREQUENCIA,
            NOME_COMPLETO,
            BILHETE_IDENTIDADE,
            DATA_EMISSAO_BI,
            DATA_VALIDADE_BI,
            SEXO,
            DATA_NASCIMENTO,
            ESTADO_CIVIL,
            CONTACTOS_TELEFONICOS,
            CONTACTO_DE_EMERGENCIA,
            MORADA_COMPLETA,
            EMAIL,
            INSTITUICAO_FORMACAO_ACESSO,
            DATA_CONCLUSAO,
            MEDIA_FINAL,
            PAI,
            MAE,
            NECESSIDADE_ESPECIAL_ID,
            POLO_ID,
            CURSOOPCIONAL1_ID,
            CURSOOPCIONAL2_ID,
            USER_ID,
            ESTADO_PREISCRICAO_CANDIDATO,
            CREATED_AT,
            UPDATED_AT
        ) VALUES (
            :cursoCandidatura,
            :modalidadeFrequencia,
            :nomeCompleto,
            :bilheteIdentidade,
            TO_DATE(:dataEmissaoBI, 'YYYY-MM-DD'),
            TO_DATE(:dataValidadeBI, 'YYYY-MM-DD'),
            :sexo,
            TO_DATE(:dataNascimento, 'YYYY-MM-DD'),
            :estadoCivil,
            :contactosTelefonicos,
            :contactoDeEmergencia,
            :moradaCompleta,
            :email,
            :instituicaoFormacaoAcesso,
            TO_DATE(:dataConclusao, 'YYYY-MM-DD'),
            :mediaFinal,
            :pai,
            :mae,
            :necessidadeEspecialId,
            :poloId,
            :cursoOpcional1Id,
            :cursoOpcional2Id,
            :userId,
            1,
            SYSDATE,
            SYSDATE
        )
        RETURNING CODIGO INTO :outId
        `,
            {
                cursoCandidatura: dto.cursoCandidatura,
                modalidadeFrequencia: dto.modalidadeFrequencia ?? null,
                nomeCompleto: dto.nomeCompleto,
                bilheteIdentidade: dto.bilheteIdentidade,
                dataEmissaoBI: dto.dataEmissaoBI ?? null,
                dataValidadeBI: dto.dataValidadeBI ?? null,
                sexo: dto.sexo,
                dataNascimento: dto.dataNascimento,
                estadoCivil: dto.estadoCivil ?? null,
                contactosTelefonicos: dto.contactosTelefonicos,
                contactoDeEmergencia: dto.contactoDeEmergencia ?? null,
                moradaCompleta: dto.moradaCompleta,
                email: dto.email,
                instituicaoFormacaoAcesso: dto.instituicaoFormacaoAcesso ?? null,
                dataConclusao: dto.dataConclusao ?? null,
                mediaFinal: dto.mediaFinal ?? null,
                pai: dto.pai ?? null,
                mae: dto.mae ?? null,
                necessidadeEspecialId: dto.necessidadeEspecialId ?? null,
                poloId: dto.poloId ?? null,
                cursoOpcional1Id: dto.cursoOpcional1Id ?? null,
                cursoOpcional2Id: dto.cursoOpcional2Id ?? null,
                userId: userId ?? null,
                outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            } as any,
        );

        const codigo = result.outId[0];

        return {
            codigo,
            message: 'Pré-registro criado com sucesso.',
            estado: 1,
        };
    }

    // ─────────────────────────────────────────────
    //  UPDATE
    // ─────────────────────────────────────────────
    async update(codigo: number, dto: UpdatePreRegistrationDto) {
        await this.assertExists(codigo);

        if (dto.bilheteIdentidade) await this.assertUniqueBI(dto.bilheteIdentidade, codigo);
        if (dto.email) await this.assertUniqueEmail(dto.email, codigo);

        await this.dataSource.query(
            `
      UPDATE FK2_TB_PREINSCRICAO
         SET NATURAZA_INSCRICAO             = NVL(:naturazaInscricao,         NATURAZA_INSCRICAO),
             CURSO_CANDIDATURA              = NVL(:cursoCandidatura,          CURSO_CANDIDATURA),
             MODALIDADE_FREQUENCIA          = NVL(:modalidadeFrequencia,      MODALIDADE_FREQUENCIA),
             NOME_COMPLETO                  = NVL(:nomeCompleto,              NOME_COMPLETO),
             BILHETE_IDENTIDADE             = NVL(:bilheteIdentidade,         BILHETE_IDENTIDADE),
             DATA_EMISSAO_BI                = NVL(TO_DATE(:dataEmissaoBI,   'YYYY-MM-DD'), DATA_EMISSAO_BI),
             DATA_VALIDADE_BI               = NVL(TO_DATE(:dataValidadeBI,  'YYYY-MM-DD'), DATA_VALIDADE_BI),
             LOCAL_EMISSAO_BI               = NVL(:localEmissaoBI,            LOCAL_EMISSAO_BI),
             NUMERO_IDENTIFICACAO_FISCAL    = NVL(:nif,                       NUMERO_IDENTIFICACAO_FISCAL),
             SEXO                           = NVL(:sexo,                      SEXO),
             DATA_NASCIMENTO                = NVL(TO_DATE(:dataNascimento,  'YYYY-MM-DD'), DATA_NASCIMENTO),
             ESTADO_CIVIL                   = NVL(:estadoCivil,               ESTADO_CIVIL),
             CONTACTOS_TELEFONICOS          = NVL(:contactosTelefonicos,      CONTACTOS_TELEFONICOS),
             CONTACTO_DE_EMERGENCIA         = NVL(:contactoDeEmergencia,      CONTACTO_DE_EMERGENCIA),
             MORADA_COMPLETA                = NVL(:moradaCompleta,            MORADA_COMPLETA),
             EMAIL                          = NVL(:email,                     EMAIL),
             NOME_PESSOA_CONTACTO_TELEFONE  = NVL(:nomePessoa,                NOME_PESSOA_CONTACTO_TELEFONE),
             INSTITUICAO_FORMACAO_ACESSO    = NVL(:instFormacao,              INSTITUICAO_FORMACAO_ACESSO),
             DATA_CONCLUSAO                 = NVL(TO_DATE(:dataConclusao,   'YYYY-MM-DD'), DATA_CONCLUSAO),
             MEDIA_FINAL                    = NVL(:mediaFinal,                MEDIA_FINAL),
             NUMERO_ORDEM_MEDICOS           = NVL(:numeroOrdem,               NUMERO_ORDEM_MEDICOS),
             INSTITUICAO_EXERCE_FUNCAO      = NVL(:instFuncao,                INSTITUICAO_EXERCE_FUNCAO),
             DATA_INICIO_TRABALHO           = NVL(TO_DATE(:dataInicioTrab,  'YYYY-MM-DD'), DATA_INICIO_TRABALHO),
             PROVINCIA_TRABALHO             = NVL(:provinciaTrabalho,         PROVINCIA_TRABALHO),
             PAI                            = NVL(:pai,                       PAI),
             MAE                            = NVL(:mae,                       MAE),
             NATURALIDADE                   = NVL(:naturalidade,              NATURALIDADE),
             CODIGO_NACIONALIDADE           = NVL(:codigoNacionalidade,       CODIGO_NACIONALIDADE),
             OCUPACAO_PAI                   = NVL(:ocupacaoPai,               OCUPACAO_PAI),
             OCUPACAO_MAE                   = NVL(:ocupacaoMae,               OCUPACAO_MAE),
             OCUPACAO_CONJUGE               = NVL(:ocupacaoConjuge,           OCUPACAO_CONJUGE),
             PROFISSAO_PAI                  = NVL(:profissaoPai,              PROFISSAO_PAI),
             PROFISSAO_MAE                  = NVL(:profissaoMae,              PROFISSAO_MAE),
             PROFISSAO_CONJUGE              = NVL(:profissaoConjuge,          PROFISSAO_CONJUGE),
             GRAU_ACADEMICO_PAI             = NVL(:grauAcPai,                 GRAU_ACADEMICO_PAI),
             GRAU_ACADEMICO_MAE             = NVL(:grauAcMae,                 GRAU_ACADEMICO_MAE),
             GRAU_ACADEMICO_CONJUGE         = NVL(:grauAcConjuge,             GRAU_ACADEMICO_CONJUGE),
             ANOLECTIVO                     = NVL(:anoLectivo,                ANOLECTIVO),
             PROVINCIA_ORIGEM               = NVL(:provinciaOrigem,           PROVINCIA_ORIGEM),
             DESLOCADO_PERMANENTE           = NVL(:deslocado,                 DESLOCADO_PERMANENTE),
             NECESSIDADE_ESPECIAL_ID        = NVL(:necessidadeId,             NECESSIDADE_ESPECIAL_ID),
             CANAL                          = NVL(:canal,                     CANAL),
             CODIGO_TIPO_CANDIDATURA        = NVL(:codigoTipoCand,            CODIGO_TIPO_CANDIDATURA),
             CODIGO_FORMA_INGRESSO          = NVL(:codigoFormaIng,            CODIGO_FORMA_INGRESSO),
             CODIGO_UTILIZADOR              = NVL(:codigoUsuario,             CODIGO_UTILIZADOR),
             ESTADO                         = NVL(:estado,                    ESTADO),
             POLO_ID                        = NVL(:poloId,                    POLO_ID),
             CURSOOPCIONAL1_ID              = NVL(:curso1Id,                  CURSOOPCIONAL1_ID),
             CURSOOPCIONAL2_ID              = NVL(:curso2Id,                  CURSOOPCIONAL2_ID),
             PERMITIR_INSCRICAO             = NVL(:permitirInscricao,         PERMITIR_INSCRICAO),
             DATA_PREESCRINCAO              = NVL(TO_DATE(:dataPreesc, 'YYYY-MM-DD HH24:MI:SS.FF'), DATA_PREESCRINCAO),
             DATA_ULTIMA_ACTUALIZACAO       = SYSDATE,
             UPDATED_AT                     = SYSDATE
       WHERE CODIGO = :codigo
      `,
            {
                naturazaInscricao: dto.naturazaInscricao ?? null,
                cursoCandidatura: dto.cursoCandidatura ?? null,
                modalidadeFrequencia: dto.modalidadeFrequencia ?? null,
                nomeCompleto: dto.nomeCompleto ?? null,
                bilheteIdentidade: dto.bilheteIdentidade ?? null,
                dataEmissaoBI: dto.dataEmissaoBI ?? null,
                dataValidadeBI: dto.dataValidadeBI ?? null,
                localEmissaoBI: dto.localEmissaoBI ?? null,
                nif: dto.numeroIdentificacaoFiscal ?? null,
                sexo: dto.sexo ?? null,
                dataNascimento: dto.dataNascimento ?? null,
                estadoCivil: dto.estadoCivil ?? null,
                contactosTelefonicos: dto.contactosTelefonicos ?? null,
                contactoDeEmergencia: dto.contactoDeEmergencia ?? null,
                moradaCompleta: dto.moradaCompleta ?? null,
                email: dto.email ?? null,
                nomePessoa: dto.nomePessoaContactoTelefone ?? null,
                instFormacao: dto.instituicaoFormacaoAcesso ?? null,
                dataConclusao: dto.dataConclusao ?? null,
                mediaFinal: dto.mediaFinal ?? null,
                numeroOrdem: dto.numeroOrdemMedicos ?? null,
                instFuncao: dto.instituicaoExerceFuncao ?? null,
                dataInicioTrab: dto.dataInicioTrabalho ?? null,
                provinciaTrabalho: dto.provinciaTrabalho ?? null,
                pai: dto.pai ?? null,
                mae: dto.mae ?? null,
                naturalidade: dto.naturalidade ?? null,
                codigoNacionalidade: dto.codigoNacionalidade ?? null,
                ocupacaoPai: dto.ocupacaoPai ?? null,
                ocupacaoMae: dto.ocupacaoMae ?? null,
                ocupacaoConjuge: dto.ocupacaoConjuge ?? null,
                profissaoPai: dto.profissaoPai ?? null,
                profissaoMae: dto.profissaoMae ?? null,
                profissaoConjuge: dto.profissaoConjuge ?? null,
                grauAcPai: dto.grauAcademicoPai ?? null,
                grauAcMae: dto.grauAcademicoMae ?? null,
                grauAcConjuge: dto.grauAcademicoConjuge ?? null,
                anoLectivo: dto.anoLectivo ?? null,
                provinciaOrigem: dto.provinciaOrigem ?? null,
                deslocado: dto.deslocadoPermanente != null ? (dto.deslocadoPermanente ? 1 : 0) : null,
                necessidadeId: dto.necessidadeEspecialId ?? null,
                canal: dto.canal ?? null,
                codigoTipoCand: dto.codigoTipoCandidatura ?? null,
                codigoFormaIng: dto.codigoFormaIngresso ?? null,
                codigoUsuario: dto.codigoUsuario ?? null,
                estado: dto.estado ?? null,
                poloId: dto.poloId ?? null,
                curso1Id: dto.cursoOpcional1Id ?? null,
                curso2Id: dto.cursoOpcional2Id ?? null,
                permitirInscricao: dto.permitirInscricao != null ? (dto.permitirInscricao ? 1 : 0) : null,
                dataPreesc: dto.dataPreescricao ?? null,
                codigo,
            } as any,
        );

        return this.findOne(codigo);
    }

    // ─────────────────────────────────────────────
    //  FIND ALL
    // ─────────────────────────────────────────────
    async findAll(query: QueryPreRegistrationDto) {
        const { page = 1, limit = 10, search, estado, anoLectivo, cursoCandidatura } = query;
        const offset = (page - 1) * limit;

        const conditions: string[] = ['1=1'];
        const params: Record<string, any> = {};

        if (search) {
            conditions.push(`(
        UPPER(NOME_COMPLETO)       LIKE UPPER(:search) OR
        UPPER(BILHETE_IDENTIDADE)  LIKE UPPER(:search) OR
        UPPER(EMAIL)               LIKE UPPER(:search) OR
        UPPER(CONTACTOS_TELEFONICOS) LIKE UPPER(:search)
      )`);
            params['search'] = `%${search}%`;
        }
        if (estado) {
            conditions.push(`ESTADO = :estado`);
            params['estado'] = estado;
        }
        if (anoLectivo) {
            conditions.push(`ANOLECTIVO = :anoLectivo`);
            params['anoLectivo'] = anoLectivo;
        }
        if (cursoCandidatura) {
            conditions.push(`UPPER(CURSO_CANDIDATURA) LIKE UPPER(:cursoCandidatura)`);
            params['cursoCandidatura'] = `%${cursoCandidatura}%`;
        }

        const where = conditions.join(' AND ');

        const [rows, countResult] = await Promise.all([
            this.dataSource.query(
                `
        SELECT * FROM (
          SELECT p.*, ROWNUM rn FROM (
            SELECT
              CODIGO, NOME_COMPLETO, BILHETE_IDENTIDADE, EMAIL,
              CONTACTOS_TELEFONICOS, CURSO_CANDIDATURA, MODALIDADE_FREQUENCIA,
              ANOLECTIVO, ESTADO, ESTADO_PREISCRICAO_CANDIDATO, CANAL,
              POLO_ID, USER_ID, PERMITIR_INSCRICAO,
              DATA_PREESCRINCAO, CREATED_AT, UPDATED_AT,
              SEXO, DATA_NASCIMENTO, NATURALIDADE, PROVINCIA_ORIGEM
            FROM FK2_TB_PREINSCRICAO
            WHERE ${where}
            ORDER BY CREATED_AT DESC
          ) p WHERE ROWNUM <= :maxRow
        ) WHERE rn > :offset
        `,
                { ...params, maxRow: offset + limit, offset } as any,
            ),
            this.dataSource.query(
                `SELECT COUNT(*) AS TOTAL FROM FK2_TB_PREINSCRICAO WHERE ${where}`,
                params as any,
            ),
        ]);

        const total = Number(countResult[0]?.TOTAL ?? 0);

        return {
            data: toLowerCaseKeys(rows),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    //
    //
    //

    //  FICHA DE INSCRIÇÃO COMPLETA
    // ─────────────────────────────────────────────
    async getFichaInscricao(userId: number) {
        const rows = await this.dataSource.query(
            `
      SELECT
        us.id                               AS user_id,
        us.name                             AS nome_completo_user,
        us.email                            AS email_user,
        us.telefone                         AS telefone,
        us.numero_documento                 AS numero_documento,
        us.foto,
        us.updated_at                       AS data_actualizacao,

        p.CODIGO                            AS codigo_preinscricao,
        p.NOME_COMPLETO,
        p.SEXO,
        p.ESTADO_CIVIL,
        p.CONTACTO_DE_EMERGENCIA,
        p.TIPO_IDENTIFICACAO,
        p.DATA_NASCIMENTO,
        p.EMAIL                             AS email_preinscricao,
        p.BILHETE_IDENTIDADE,
        p.CONTACTOS_TELEFONICOS,
        p.NUMERO_IDENTIFICACAO_FISCAL,
        p.MORADA_COMPLETA,
        p.NATURALIDADE,
        p.PROVINCIA_ORIGEM,
        p.CODIGO_NACIONALIDADE,
        p.LOCAL_EMISSAO_BI,
        p.DATA_EMISSAO_BI,
        p.DATA_VALIDADE_BI,
        p.NOME_PESSOA_CONTACTO_TELEFONE,
        p.DESLOCADO_PERMANENTE,

        -- Formação anterior
        p.INSTITUICAO_FORMACAO,
        p.INSTITUICAO_FORMACAO_ACESSO,
        p.DATA_CONCLUSAO,
        p.MEDIA_FINAL,
        p.NUMERO_ORDEM_MEDICOS,
        p.CODIGO_HABILITACAO_ANTERIOR,
        p.CODIGO_TIPO_ESTABELECIMENTO_SECUNDARIO,
        p.CODIGO_PAIS_HABILITACAO_ANTERIOR,
        p.CURSO_ENSINO_MEDIO,

        -- Dados profissionais
        p.INSTITUICAO_EXERCE_FUNCAO,
        p.DATA_INICIO_TRABALHO,
        p.PROVINCIA_TRABALHO,

        -- Família
        p.PAI,
        p.MAE,
        p.OCUPACAO_PAI,
        p.OCUPACAO_MAE,
        p.OCUPACAO_CONJUGE,
        p.PROFISSAO_PAI,
        p.PROFISSAO_MAE,
        p.PROFISSAO_CONJUGE,
        p.GRAU_ACADEMICO_PAI,
        p.GRAU_ACADEMICO_MAE,
        p.GRAU_ACADEMICO_CONJUGE,

        -- Candidatura / controlo
        p.DATA_PREESCRINCAO                 AS data_candidatura,
        p.DATA_ULTIMA_ACTUALIZACAO          AS data_ultima_atualizacao,
        p.ESTADO,
        p.ESTADO_PREISCRICAO_CANDIDATO,
        p.PERMITIR_INSCRICAO,
        p.CANAL,
        p.CODIGO_TIPO_CANDIDATURA,
        p.CODIGO_FORMA_INGRESSO,
        p.SALDO,
        p.SALDO_ANTERIOR,
        p.SALDO_RESET,
        p.SALDO_RESET_ANTER,
        p.DESCONTO,
        p.OBS_SALDO,
        p.OBS_DESCONTO,
        p.ISENCAO_MULTA,
        p.CODIGO_VALIDACAO_EMAIL,
        p.ESTADO_ATUALIZACAO_EMAIL,
        p.CREATED_AT,
        p.UPDATED_AT,

        -- Opção 1 (curso principal)
        p.CURSO_CANDIDATURA                 AS curso_opcao1_codigo,
        cr1.DESIGNACAO                      AS curso_opcao1_designacao,
        cr1.DURACAO                         AS curso_opcao1_duracao,

        -- Opção 2
        p.CURSOOPCIONAL1_ID                 AS curso_opcao2_codigo,
        cr2.DESIGNACAO                      AS curso_opcao2_designacao,

        -- Opção 3
        p.CURSOOPCIONAL2_ID                 AS curso_opcao3_codigo,
        cr3.DESIGNACAO                      AS curso_opcao3_designacao,

        -- Turno Opção 1
        p.CODIGO_TURNO                      AS turno_opcao1_codigo,
        per1.DESIGNACAO                     AS turno_opcao1_designacao,

        -- Turno Opção 2
        p.CODIGO_TURNO_OPTIONAL             AS turno_opcao2_codigo,
        per2.DESIGNACAO                     AS turno_opcao2_designacao,

        -- Ano lectivo
        al.DESIGNACAO                       AS ano_lectivo,
        al.CODIGO                           AS ano_lectivo_codigo,

        -- Polo
        polos.ID                            AS polo_id,
        polos.DESIGNACAO                    AS polo,

        -- Necessidade especial
        ne.ID                               AS necessidade_especial_id,
        ne.DESIGNACAO                       AS necessidade_especial

      FROM fk2_users                        us
        INNER JOIN fk2_tb_preinscricao      p     ON p.USER_ID              = us.ID
        LEFT  JOIN fk2_tb_cursos            cr1   ON cr1.CODIGO             = p.CURSO_CANDIDATURA
        LEFT  JOIN fk2_tb_cursos            cr2   ON cr2.CODIGO             = p.CURSOOPCIONAL1_ID
        LEFT  JOIN fk2_tb_cursos            cr3   ON cr3.CODIGO             = p.CURSOOPCIONAL2_ID
        LEFT  JOIN fk2_tb_periodos          per1  ON per1.CODIGO            = p.CODIGO_TURNO
        LEFT  JOIN fk2_tb_periodos          per2  ON per2.CODIGO            = p.CODIGO_TURNO_OPTIONAL
        LEFT  JOIN fk2_tb_ano_lectivo       al    ON al.CODIGO              = us.ANO_LECTIVO_ID
        LEFT  JOIN fk2_polos                polos ON polos.ID               = p.POLO_ID
        LEFT  JOIN fk2_necessidade_especiais ne   ON ne.ID                  = p.NECESSIDADE_ESPECIAL_ID
      WHERE us.ID = :userId
      `,
            { userId } as any,
        );

        if (!rows.length)
            throw new NotFoundException(
                `Nenhuma ficha de inscrição encontrada para o utilizador ${userId}`,
            );

        // Devolve a ficha com cursos e turnos organizados em arrays para facilitar o front-end
        const row = rows[0];

        return {
            // ── Utilizador ────────────────────────────────────
            utilizador: {
                user_id: row.USER_ID,
                nome: row.NOME_COMPLETO_USER,
                email: row.EMAIL_USER,
                telefone: row.TELEFONE,
                numero_documento: row.NUMERO_DOCUMENTO,
                foto: row.FOTO,
                data_actualizacao: row.DATA_ACTUALIZACAO,
            },

            // ── Dados pessoais ────────────────────────────────
            dados_pessoais: {
                nome_completo: row.NOME_COMPLETO,
                sexo: row.SEXO,
                data_nascimento: row.DATA_NASCIMENTO,
                estado_civil: row.ESTADO_CIVIL,
                naturalidade: row.NATURALIDADE,
                provincia_origem: row.PROVINCIA_ORIGEM,
                codigo_nacionalidade: row.CODIGO_NACIONALIDADE,
                contactos_telefonicos: row.CONTACTOS_TELEFONICOS,
                contacto_de_emergencia: row.CONTACTO_DE_EMERGENCIA,
                nome_pessoa_contacto: row.NOME_PESSOA_CONTACTO_TELEFONE,
                morada_completa: row.MORADA_COMPLETA,
                email: row.EMAIL_PREINSCRICAO,
                deslocado_permanente: row.DESLOCADO_PERMANENTE === 1,
                necessidade_especial_id: row.NECESSIDADE_ESPECIAL_ID,
                necessidade_especial: row.NECESSIDADE_ESPECIAL,
            },

            // ── Documento ─────────────────────────────────────
            documento: {
                tipo_identificacao: row.TIPO_IDENTIFICACAO,
                bilhete_identidade: row.BILHETE_IDENTIDADE,
                numero_documento: row.NUMERO_DOCUMENTO,
                nif: row.NUMERO_IDENTIFICACAO_FISCAL,
                local_emissao_bi: row.LOCAL_EMISSAO_BI,
                data_emissao_bi: row.DATA_EMISSAO_BI,
                data_validade_bi: row.DATA_VALIDADE_BI,
            },

            // ── Formação anterior ─────────────────────────────
            formacao_anterior: {
                instituicao_formacao: row.INSTITUICAO_FORMACAO,
                instituicao_formacao_acesso: row.INSTITUICAO_FORMACAO_ACESSO,
                data_conclusao: row.DATA_CONCLUSAO,
                media_final: row.MEDIA_FINAL,
                numero_ordem_medicos: row.NUMERO_ORDEM_MEDICOS,
                curso_ensino_medio: row.CURSO_ENSINO_MEDIO,
                codigo_habilitacao_anterior: row.CODIGO_HABILITACAO_ANTERIOR,
                codigo_tipo_estabelecimento_secundario: row.CODIGO_TIPO_ESTABELECIMENTO_SECUNDARIO,
                codigo_pais_habilitacao_anterior: row.CODIGO_PAIS_HABILITACAO_ANTERIOR,
            },

            // ── Dados profissionais ───────────────────────────
            dados_profissionais: {
                instituicao_exerce_funcao: row.INSTITUICAO_EXERCE_FUNCAO,
                data_inicio_trabalho: row.DATA_INICIO_TRABALHO,
                provincia_trabalho: row.PROVINCIA_TRABALHO,
            },

            // ── Família ───────────────────────────────────────
            familia: {
                pai: row.PAI,
                mae: row.MAE,
                ocupacao_pai: row.OCUPACAO_PAI,
                ocupacao_mae: row.OCUPACAO_MAE,
                ocupacao_conjuge: row.OCUPACAO_CONJUGE,
                profissao_pai: row.PROFISSAO_PAI,
                profissao_mae: row.PROFISSAO_MAE,
                profissao_conjuge: row.PROFISSAO_CONJUGE,
                grau_academico_pai: row.GRAU_ACADEMICO_PAI,
                grau_academico_mae: row.GRAU_ACADEMICO_MAE,
                grau_academico_conjuge: row.GRAU_ACADEMICO_CONJUGE,
            },

            // ── Candidatura ───────────────────────────────────
            candidatura: {
                codigo_preinscricao: row.CODIGO_PREINSCRICAO,
                data_candidatura: row.DATA_CANDIDATURA,
                data_ultima_atualizacao: row.DATA_ULTIMA_ATUALIZACAO,
                estado: row.ESTADO,
                estado_candidato: row.ESTADO_PREISCRICAO_CANDIDATO,
                permitir_inscricao: row.PERMITIR_INSCRICAO === 1,
                canal: row.CANAL,
                codigo_tipo_candidatura: row.CODIGO_TIPO_CANDIDATURA,
                codigo_forma_ingresso: row.CODIGO_FORMA_INGRESSO,
                ano_lectivo: row.ANO_LECTIVO,
                ano_lectivo_codigo: row.ANO_LECTIVO_CODIGO,
                polo_id: row.POLO_ID,
                polo: row.POLO,
            },

            // ── Opções de curso ───────────────────────────────
            opcoes_curso: [
                {
                    opcao: 1,
                    codigo: row.CURSO_OPCAO1_CODIGO,
                    designacao: row.CURSO_OPCAO1_DESIGNACAO,
                    duracao: row.CURSO_OPCAO1_DURACAO,
                    turno_codigo: row.TURNO_OPCAO1_CODIGO,
                    turno: row.TURNO_OPCAO1_DESIGNACAO,
                },
                {
                    opcao: 2,
                    codigo: row.CURSO_OPCAO2_CODIGO,
                    designacao: row.CURSO_OPCAO2_DESIGNACAO,
                    turno_codigo: row.TURNO_OPCAO2_CODIGO,
                    turno: row.TURNO_OPCAO2_DESIGNACAO,
                },
                {
                    opcao: 3,
                    codigo: row.CURSO_OPCAO3_CODIGO,
                    designacao: row.CURSO_OPCAO3_DESIGNACAO,
                },
            ].filter((o) => o.codigo != null),

            // ── Financeiro ────────────────────────────────────
            financeiro: {
                saldo: row.SALDO,
                saldo_anterior: row.SALDO_ANTERIOR,
                saldo_reset: row.SALDO_RESET,
                saldo_reset_anterior: row.SALDO_RESET_ANTER,
                desconto: row.DESCONTO,
                obs_saldo: row.OBS_SALDO,
                obs_desconto: row.OBS_DESCONTO,
                isencao_multa: row.ISENCAO_MULTA,
            },

            // ── Email / validação ─────────────────────────────
            validacao: {
                codigo_validacao_email: row.CODIGO_VALIDACAO_EMAIL,
                estado_atualizacao_email: row.ESTADO_ATUALIZACAO_EMAIL,
            },

            created_at: row.CREATED_AT,
            updated_at: row.UPDATED_AT,
        };
    }

    // INFORMAÇÕES GERAIS DO CANDIDATO
    async getCandidaturaUserData(userId: number): Promise<any> {
        const result = await this.dataSource.query(
            `
    SELECT
      us.id                         AS user_id,
      p.Nome_Completo,
      p.email                      AS email,
      p.contactos_telefonicos                   AS telefone,
      p.bilhete_identidade           AS numero_documento,
      p.Codigo                      AS codigo_preinscricao,
      a.data                        AS data_admissao,
      hp.data_realizacao            AS data_prova,
      hp.hora_inicio,
      hp.hora_fim,
      tc.STATUS_                    AS status_prova,
      pr.DESCRICAO                  AS lista_de_provas, 
      s.DESIGNACAO                   AS sala_de_prova,


      CASE
        WHEN p.Codigo  IS NULL                                 THEN 'SEM_PRE_INSCRICAO'
        WHEN tc.id     IS NULL                                 THEN 'SEM_ADMISSAO'
        WHEN tc.STATUS_ = 0 AND hp.data_realizacao > SYSDATE  THEN 'AGUARDANDO_DIA_DA_PROVA'
        WHEN tc.STATUS_ = 0 AND hp.data_realizacao <= SYSDATE THEN 'AGUARDANDO_RESULTADO'
        WHEN a.mediafinal < 10                                 THEN 'NAO_ADMITIDO'
        WHEN a.mediafinal >= 10 AND m.Codigo IS NULL           THEN 'ADMITIDO_SEM_MATRICULA'
        WHEN a.mediafinal >= 10 AND m.Codigo IS NOT NULL       THEN 'ALUNO_MATRICULADO'
        ELSE                                                        'ALUNO_MATRICULADO'
      END AS estado_aluno

    FROM fk2_users us

      LEFT JOIN (
        SELECT * FROM (
          SELECT p.*, ROW_NUMBER() OVER (PARTITION BY p.user_id ORDER BY p.Codigo DESC) AS rn
          FROM fk2_tb_preinscricao p
        ) WHERE rn = 1
      ) p ON p.user_id = us.id

      LEFT JOIN (
        SELECT * FROM (
          SELECT a.*, ROW_NUMBER() OVER (PARTITION BY a.pre_incricao ORDER BY a.codigo DESC) AS rn
          FROM fk2_tb_admissao a
        ) WHERE rn = 1
      ) a ON a.pre_incricao = p.Codigo

      LEFT JOIN (
        SELECT * FROM (
          SELECT m.*, ROW_NUMBER() OVER (PARTITION BY m.Codigo_Aluno ORDER BY m.Codigo DESC) AS rn
          FROM fk2_tb_matriculas m
        ) WHERE rn = 1
      ) m ON m.Codigo_Aluno = a.codigo

      LEFT JOIN (
        SELECT * FROM (
          SELECT tc.*, ROW_NUMBER() OVER (PARTITION BY tc.candidato_id ORDER BY tc.id DESC) AS rn
          FROM fk2_candidato_provas tc
        ) WHERE rn = 1
      ) tc ON tc.candidato_id = p.Codigo

      LEFT JOIN (
        SELECT * FROM (
          SELECT hp.*, ROW_NUMBER() OVER (PARTITION BY hp.id ORDER BY hp.id DESC) AS rn
          FROM FK2_TB_HORARIO_PROVA hp
        ) WHERE rn = 1
      ) hp ON hp.id = tc.HORARIO_PROVA_ID

      LEFT JOIN fk2_provas pr ON pr.id = tc.prova_id
      LEFT JOIN fk2_tb_salas s on s.codigo = hp.sala_id

    WHERE us.id = :userId
  
    `,
            { userId } as any,
        );

        if (!result || result.length === 0) {
            throw new NotFoundException('Utilizador não encontrado');
        }

        return toLowerCaseKeys(result[0]);
    }
    // ─────────────────────────────────────────────
    //  FIND ONE
    // ─────────────────────────────────────────────
    async findOne(codigo: number) {
        const rows = await this.dataSource.query(
            `SELECT * FROM FK2_TB_PREINSCRICAO WHERE CODIGO = :codigo`,
            { codigo } as any,
        );
        if (!rows.length)
            throw new NotFoundException(`Pré-inscrição com código ${codigo} não encontrada`);
        return toLowerCaseKeys(rows[0]);
    }

    // ─────────────────────────────────────────────
    //  FIND BY BI
    // ─────────────────────────────────────────────
    async findByBI(bi: string) {
        const rows = await this.dataSource.query(
            `SELECT * FROM FK2_TB_PREINSCRICAO WHERE BILHETE_IDENTIDADE = :bi`,
            { bi } as any,
        );
        if (!rows.length)
            throw new NotFoundException(`Pré-inscrição com BI ${bi} não encontrada`);
        return rows[0];
    }

    // ─────────────────────────────────────────────
    //  MUDAR ESTADO
    // ─────────────────────────────────────────────
    async changeEstado(codigo: number, estado: string, obs?: string) {
        await this.assertExists(codigo);

        await this.dataSource.query(
            `
      UPDATE FK2_TB_PREINSCRICAO
         SET ESTADO                        = :estado,
             ESTADO_PREISCRICAO_CANDIDATO  = :estado,
             DATA_ULTIMA_ACTUALIZACAO      = SYSDATE,
             UPDATED_AT                    = SYSDATE
       WHERE CODIGO = :codigo
      `,
            { estado, codigo } as any,
        );

        return this.findOne(codigo);
    }

    // ─────────────────────────────────────────────
    //  PERMITIR / BLOQUEAR INSCRIÇÃO
    // ─────────────────────────────────────────────
    async togglePermitirInscricao(codigo: number, permitir: boolean) {
        await this.assertExists(codigo);

        await this.dataSource.query(
            `
      UPDATE FK2_TB_PREINSCRICAO
         SET PERMITIR_INSCRICAO = :val, UPDATED_AT = SYSDATE
       WHERE CODIGO = :codigo
      `,
            { val: permitir ? 1 : 0, codigo } as any,
        );

        return this.findOne(codigo);
    }

    // ─────────────────────────────────────────────
    //  DELETE (hard delete — ajusta se precisares de soft)
    // ─────────────────────────────────────────────
    async remove(codigo: number) {
        await this.assertExists(codigo);

        await this.dataSource.query(
            `DELETE FROM FK2_TB_PREINSCRICAO WHERE CODIGO = :codigo`,
            { codigo } as any,
        );

        return { message: `Pré-inscrição ${codigo} removida com sucesso` };
    }

    // ─────────────────────────────────────────────
    //  HELPERS PRIVADOS
    // ─────────────────────────────────────────────
    private async assertExists(codigo: number) {
        const rows = await this.dataSource.query(
            `SELECT CODIGO FROM FK2_TB_PREINSCRICAO WHERE CODIGO = :codigo`,
            { codigo } as any,
        );
        if (!rows.length)
            throw new NotFoundException(`Pré-inscrição com código ${codigo} não encontrada`);
    }

    private async assertUniqueBI(bi: string, excludeCodigo?: number) {
        const rows = await this.dataSource.query(
            `SELECT CODIGO FROM FK2_TB_PREINSCRICAO WHERE BILHETE_IDENTIDADE = :bi ${excludeCodigo ? 'AND CODIGO != :excludeCodigo' : ''}`,
            excludeCodigo ? { bi, excludeCodigo } : { bi } as any,
        );
        if (rows.length)
            throw new ConflictException('Já existe uma pré-inscrição com este Bilhete de Identidade');
    }

    private async assertUniqueEmail(email: string, excludeCodigo?: number) {
        const rows = await this.dataSource.query(
            `SELECT CODIGO FROM FK2_TB_PREINSCRICAO WHERE UPPER(EMAIL) = UPPER(:email) ${excludeCodigo ? 'AND CODIGO != :excludeCodigo' : ''}`,
            excludeCodigo ? { email, excludeCodigo } : { email } as any,
        );
        if (rows.length)
            throw new ConflictException('Já existe uma pré-inscrição com este e-mail');
    }
}