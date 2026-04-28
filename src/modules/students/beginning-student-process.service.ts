import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import oracledb from 'oracledb';
import { BlockUserDto } from './dto/block-user';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto, EstadoUser } from './dto/create-user.dto';
import { gerarHashExterno } from '../util/hash.util';
import { AnoLectivoUtil } from '../util/current-academic-year';

@Injectable()
export class BeginningStudentProcessService {
    constructor(private readonly dataSource: DataSource, private readonly anoLectivoUtil: AnoLectivoUtil) { }


    // ─────────────────────────────────────────────
    //  CREATE
    // ─────────────────────────────────────────────
    async create(dto: CreateUserDto) {
        // Verifica duplicados
        await this.assertUniqueEmail(dto.email);
        await this.assertUniqueDocument(dto.numero_documento);
        await this.assertUniquePhone(dto.telefone);

        const hashedPassword: string = await gerarHashExterno(dto.password);
        const anoCorrente = await this.anoLectivoUtil.getAnoAtualId();
        if (!anoCorrente) {
            throw new BadRequestException('Ano letivo atual não encontrado');
        }


        const result = await this.dataSource.query(
            `
      INSERT INTO FK2_USERS (
        NAME,
        TELEFONE,
        EMAIL,
        TIPO_DE_DOCUMENTO,
        NUMERO_DOCUMENTO,
        EMAIL_VERIFIED_AT,
        PASSWORD,
        REMEMBER_TOKEN,
        CREATED_AT,
        UPDATED_AT,
        CANAL,
        USERNAME,
        GRAUACADEMICO,
        FACULDADE,
        ESTADO,
        FOTO,
        MOTIVO_BLOQUEIO,
        STATUS_,
        ANO_LECTIVO_ID
      ) VALUES (
        :name,
        :telefone,
        :email,
        :tipoDocumento,
        :numeroDocumento,
        NULL,
        :password,
        NULL,
        SYSDATE,
        SYSDATE,
        :canal,
        :username,
        :grauacademico,
        :faculdade,
        :estado,
        :foto,
        NULL,
        1,
        :anoLectivoId
      ) RETURNING ID INTO :outId
      `,
            {
                name: dto.name,
                telefone: dto.telefone ?? null,
                email: dto.email,
                tipoDocumento: dto.tipo_de_documento ?? null,
                numeroDocumento: dto.numero_documento ?? null,
                canal: dto.canal ?? null,
                username: null,
                grauacademico: dto.grauacademico ?? null,
                faculdade: dto.faculdade ?? null,
                estado: dto.estado ?? 1,
                foto: null,
                anoLectivoId: dto.ano_lectivo_id ?? null,
                password: hashedPassword,
                outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            } as any,
        );

        const userId = result.outId[0];
        return { message: `Utilizador ${dto.name || userId} criado com sucesso` };
    }

    // ─────────────────────────────────────────────
    //  UPDATE
    // ─────────────────────────────────────────────
    async update(id: number, dto: UpdateUserDto) {
        await this.assertExists(id);

        if (dto.email) await this.assertUniqueEmail(dto.email, id);
        if (dto.username) await this.assertUniqueUsername(dto.username, id);

        let hashedPassword: string | undefined;
        if (dto.password) {

            hashedPassword = await gerarHashExterno(dto.password);
        }

        await this.dataSource.query(
            `
      UPDATE FK2_USERS
         SET NAME              = NVL(:name,           NAME),
             TELEFONE          = NVL(:telefone,        TELEFONE),
             EMAIL             = NVL(:email,           EMAIL),
             TIPO_DE_DOCUMENTO = NVL(:tipoDocumento,   TIPO_DE_DOCUMENTO),
             NUMERO_DOCUMENTO  = NVL(:numeroDocumento, NUMERO_DOCUMENTO),
           --  USERNAME          = NVL(:username,        USERNAME),
             PASSWORD          = NVL(:password,        PASSWORD),
             CANAL             = NVL(:canal,           CANAL),
             GRAUACADEMICO     = NVL(:grauacademico,   GRAUACADEMICO),
             FACULDADE         = NVL(:faculdade,        FACULDADE),
             ESTADO            = NVL(:estado,          ESTADO),
             MOTIVO_BLOQUEIO   = NVL(:motivoBloqueio,  MOTIVO_BLOQUEIO),
             ANO_LECTIVO_ID    = NVL(:anoLectivoId,    ANO_LECTIVO_ID),
             FOTO              = NVL(:foto,            FOTO),
             UPDATED_AT        = SYSDATE
       WHERE ID = :id
      `,
            {
                name: dto.name ?? null,
                telefone: dto.telefone ?? null,
                email: dto.email ?? null,
                tipoDocumento: dto.tipo_de_documento ?? null,
                numeroDocumento: dto.numero_documento ?? null,
                //  username: dto.username ?? null,
                password: hashedPassword ?? null,
                canal: dto.canal ?? null,
                grauacademico: dto.grauacademico ?? null,
                faculdade: dto.faculdade ?? null,
                estado: dto.estado ?? null,
                motivoBloqueio: dto.motivo_bloqueio ?? null,
                anoLectivoId: dto.ano_lectivo_id ?? null,
                foto: dto.foto ?? null,
                id,
            } as any,
        );

        return { message: `Utilizador actualziado com sucesso` };
    }

    // ─────────────────────────────────────────────
    //  FIND ONE
    // ─────────────────────────────────────────────
    async findOne(id: number) {
        const rows = await this.dataSource.query(
            `
      SELECT ID, NAME, TELEFONE, EMAIL, TIPO_DE_DOCUMENTO,
             NUMERO_DOCUMENTO, USERNAME, CANAL, GRAUACADEMICO,
             FACULDADE, ESTADO, FOTO, MOTIVO_BLOQUEIO,
             STATUS_, ANO_LECTIVO_ID, CREATED_AT, UPDATED_AT,
             EMAIL_VERIFIED_AT
        FROM FK2_USERS
       WHERE ID = :id AND STATUS_ = 1
      `,
            { id } as any,
        );

        if (!rows.length) throw new NotFoundException(`Utilizador com ID ${id} não encontrado`);
        return rows[0];
    }

    // ─────────────────────────────────────────────
    //  SOFT DELETE
    // ─────────────────────────────────────────────
    async remove(id: number) {
        await this.assertExists(id);

        await this.dataSource.query(
            `UPDATE FK2_USERS SET STATUS_ = 0, UPDATED_AT = SYSDATE WHERE ID = :id`,
            { id } as any,
        );

        return { message: `Utilizador ${id} removido com sucesso` };
    }

    // ─────────────────────────────────────────────
    //  BLOQUEAR / DESBLOQUEAR
    // ─────────────────────────────────────────────
    async block(id: number, dto: BlockUserDto) {
        await this.assertExists(id);

        await this.dataSource.query(
            `
      UPDATE FK2_USERS
         SET ESTADO = :estado,
             MOTIVO_BLOQUEIO = :motivo,
             UPDATED_AT = SYSDATE
       WHERE ID = :id
      `,
            { estado: EstadoUser.BLOQUEADO, motivo: dto.motivo_bloqueio ?? null, id } as any,
        );

        return this.findOne(id);
    }

    async unblock(id: number) {
        await this.assertExists(id);

        await this.dataSource.query(
            `
      UPDATE FK2_USERS
         SET ESTADO = :estado,
             MOTIVO_BLOQUEIO = NULL,
             UPDATED_AT = SYSDATE
       WHERE ID = :id
      `,
            { estado: EstadoUser.ACTIVO, id } as any,
        );

        return this.findOne(id);
    }

    // ─────────────────────────────────────────────
    //  VERIFICAR E-MAIL
    // ─────────────────────────────────────────────
    async verifyEmail(id: number) {
        await this.assertExists(id);

        await this.dataSource.query(
            `
      UPDATE FK2_USERS
         SET EMAIL_VERIFIED_AT = SYSDATE,
             ESTADO = :estado,
             UPDATED_AT = SYSDATE
       WHERE ID = :id AND EMAIL_VERIFIED_AT IS NULL
      `,
            { estado: EstadoUser.ACTIVO, id } as any,
        );

        return this.findOne(id);
    }



    // ─────────────────────────────────────────────
    //  HELPERS PRIVADOS
    // ─────────────────────────────────────────────
    private async assertExists(id: number) {
        const rows = await this.dataSource.query(
            `SELECT ID FROM FK2_USERS WHERE ID = :id AND STATUS_ = 1`,
            { id } as any,
        );
        if (!rows.length) throw new NotFoundException(`Utilizador com ID ${id} não encontrado`);
    }

    private async assertUniquePhone(phone: string, excludeId?: number) {
        const rows = await this.dataSource.query(
            `SELECT ID FROM FK2_USERS WHERE UPPER(TELEFONE) = UPPER(:phone) AND STATUS_ = 1 ${excludeId ? 'AND ID != :excludeId' : ''}`,
            excludeId ? { phone, excludeId } : { phone } as any,
        );
        if (rows.length) throw new ConflictException('Este telefone já está em uso');
    }

    private async assertUniqueDocument(document: string, excludeId?: number) {
        const rows = await this.dataSource.query(
            `SELECT ID FROM FK2_USERS WHERE UPPER(NUMERO_DOCUMENTO) = UPPER(:document) AND STATUS_ = 1 ${excludeId ? 'AND ID != :excludeId' : ''}`,
            excludeId ? { document, excludeId } : { document } as any,
        );
        if (rows.length) throw new ConflictException('Este documento já está em uso');
    }

    private async assertUniqueEmail(email: string, excludeId?: number) {
        const rows = await this.dataSource.query(
            `SELECT ID FROM FK2_USERS WHERE UPPER(EMAIL) = UPPER(:email) AND STATUS_ = 1 ${excludeId ? 'AND ID != :excludeId' : ''}`,
            excludeId ? { email, excludeId } : { email } as any,
        );
        if (rows.length) throw new ConflictException('Este e-mail já está em uso');
    }

    private async assertUniqueUsername(username: string, excludeId?: number) {
        const rows = await this.dataSource.query(
            `SELECT ID FROM FK2_USERS WHERE UPPER(USERNAME) = UPPER(:username) AND STATUS_ = 1 ${excludeId ? 'AND ID != :excludeId' : ''}`,
            excludeId ? { username, excludeId } : { username } as any,
        );
        if (rows.length) throw new ConflictException('Este username já está em uso');
    }



}