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
    async create(dto: CreatePreRegistrationDto, userId?: number) {
        await this.assertUniqueBI(dto.bilheteIdentidade);
        await this.assertUniqueEmail(dto.email);

        const result = await this.dataSource.query(
            `
      INSERT INTO FK2_TB_PREINSCRICAO (
        NATURAZA_INSCRICAO,
        CURSO_CANDIDATURA,
        MODALIDADE_FREQUENCIA,
        NOME_COMPLETO,
        BILHETE_IDENTIDADE,
        DATA_EMISSAO_BI,
        DATA_VALIDADE_BI,
        LOCAL_EMISSAO_BI,
        NUMERO_IDENTIFICACAO_FISCAL,
        SEXO,
        DATA_NASCIMENTO,
        ESTADO_CIVIL,
        CONTACTOS_TELEFONICOS,
        CONTACTO_DE_EMERGENCIA,
        MORADA_COMPLETA,
        EMAIL,
        NOME_PESSOA_CONTACTO_TELEFONE,
        INSTITUICAO_FORMACAO_ACESSO,
        DATA_CONCLUSAO,
        MEDIA_FINAL,
        NUMERO_ORDEM_MEDICOS,
        INSTITUICAO_EXERCE_FUNCAO,
        DATA_INICIO_TRABALHO,
        PROVINCIA_TRABALHO,
        PAI,
        MAE,
        NATURALIDADE,
        CODIGO_NACIONALIDADE,
        OCUPACAO_PAI,
        OCUPACAO_MAE,
        OCUPACAO_CONJUGE,
        PROFISSAO_PAI,
        PROFISSAO_MAE,
        PROFISSAO_CONJUGE,
        GRAU_ACADEMICO_PAI,
        GRAU_ACADEMICO_MAE,
        GRAU_ACADEMICO_CONJUGE,
        ANOLECTIVO,
        PROVINCIA_ORIGEM,
        DESLOCADO_PERMANENTE,
        NECESSIDADE_ESPECIAL_ID,
        CANAL,
        CODIGO_TIPO_CANDIDATURA,
        CODIGO_FORMA_INGRESSO,
        CODIGO_UTILIZADOR,
        ESTADO,
        POLO_ID,
        CURSOOPCIONAL1_ID,
        CURSOOPCIONAL2_ID,
        PERMITIR_INSCRICAO,
        DATA_PREESCRINCAO,
        USER_ID,
        ESTADO_PREISCRICAO_CANDIDATO,
        CREATED_AT,
        UPDATED_AT
      ) VALUES (
        :naturazaInscricao,
        :cursoCandidatura,
        :modalidadeFrequencia,
        :nomeCompleto,
        :bilheteIdentidade,
        TO_DATE(:dataEmissaoBI,    'YYYY-MM-DD'),
        TO_DATE(:dataValidadeBI,   'YYYY-MM-DD'),
        :localEmissaoBI,
        :numeroIdentificacaoFiscal,
        :sexo,
        TO_DATE(:dataNascimento,   'YYYY-MM-DD'),
        :estadoCivil,
        :contactosTelefonicos,
        :contactoDeEmergencia,
        :moradaCompleta,
        :email,
        :nomePessoaContactoTelefone,
        :instituicaoFormacaoAcesso,
        TO_DATE(:dataConclusao,    'YYYY-MM-DD'),
        :mediaFinal,
        :numeroOrdemMedicos,
        :instituicaoExerceFuncao,
        TO_DATE(:dataInicioTrabalho,'YYYY-MM-DD'),
        :provinciaTrabalho,
        :pai,
        :mae,
        :naturalidade,
        :codigoNacionalidade,
        :ocupacaoPai,
        :ocupacaoMae,
        :ocupacaoConjuge,
        :profissaoPai,
        :profissaoMae,
        :profissaoConjuge,
        :grauAcademicoPai,
        :grauAcademicoMae,
        :grauAcademicoConjuge,
        :anoLectivo,
        :provinciaOrigem,
        :deslocadoPermanente,
        :necessidadeEspecialId,
        :canal,
        :codigoTipoCandidatura,
        :codigoFormaIngresso,
        :codigoUsuario,
        NVL(:estado, 1),
        :poloId,
        :cursoOpcional1Id,
        :cursoOpcional2Id,
        :permitirInscricao,
        TO_DATE(:dataPreescricao, 'YYYY-MM-DD HH24:MI:SS'),
        :userId,
        1,
        SYSDATE,
        SYSDATE
      ) RETURNING CODIGO INTO :outId
      `,
            {
                naturazaInscricao: dto.naturazaInscricao ?? null,
                cursoCandidatura: dto.cursoCandidatura,
                modalidadeFrequencia: dto.modalidadeFrequencia ?? null,
                nomeCompleto: dto.nomeCompleto,
                bilheteIdentidade: dto.bilheteIdentidade,
                dataEmissaoBI: dto.dataEmissaoBI ?? null,
                dataValidadeBI: dto.dataValidadeBI ?? null,
                localEmissaoBI: dto.localEmissaoBI ?? null,
                numeroIdentificacaoFiscal: dto.numeroIdentificacaoFiscal,
                sexo: dto.sexo,
                dataNascimento: dto.dataNascimento,
                estadoCivil: dto.estadoCivil ?? null,
                contactosTelefonicos: dto.contactosTelefonicos,
                contactoDeEmergencia: dto.contactoDeEmergencia ?? null,
                moradaCompleta: dto.moradaCompleta,
                email: dto.email,
                nomePessoaContactoTelefone: dto.nomePessoaContactoTelefone ?? null,
                instituicaoFormacaoAcesso: dto.instituicaoFormacaoAcesso ?? null,
                dataConclusao: dto.dataConclusao ?? null,
                mediaFinal: dto.mediaFinal ?? null,
                numeroOrdemMedicos: dto.numeroOrdemMedicos ?? null,
                instituicaoExerceFuncao: dto.instituicaoExerceFuncao ?? null,
                dataInicioTrabalho: dto.dataInicioTrabalho ?? null,
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
                grauAcademicoPai: dto.grauAcademicoPai ?? null,
                grauAcademicoMae: dto.grauAcademicoMae ?? null,
                grauAcademicoConjuge: dto.grauAcademicoConjuge ?? null,
                anoLectivo: dto.anoLectivo ?? null,
                provinciaOrigem: dto.provinciaOrigem ?? null,
                deslocadoPermanente: dto.deslocadoPermanente ? 1 : 0,
                necessidadeEspecialId: dto.necessidadeEspecialId ?? null,
                canal: dto.canal ?? null,
                codigoTipoCandidatura: dto.codigoTipoCandidatura ?? null,
                codigoFormaIngresso: dto.codigoFormaIngresso ?? null,
                codigoUsuario: dto.codigoUsuario ?? null,
                estado: dto.estado ?? null,
                poloId: dto.poloId ?? null,
                cursoOpcional1Id: dto.cursoOpcional1Id ?? null,
                cursoOpcional2Id: dto.cursoOpcional2Id ?? null,
                permitirInscricao: dto.permitirInscricao ? 1 : 0,
                dataPreescricao: dto.dataPreescricao ?? null,
                userId: userId ?? null,
                outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            } as any,
        );

        const codigo = result.outId[0];
        return {
            codigo,
            message: 'Pré-registro criado com sucesso.',
            estado: 1
        }
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