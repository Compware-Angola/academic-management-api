import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as oracledb from 'oracledb';
import { CreatePreInscritoDto } from './dto/create-pre-inscrito.dto';
import { UpdatePreInscritoDto } from './dto/update-pre-inscrito.dto';
import { FindPreInscritoDto } from './dto/find-pre-inscrito.dto';
import { gerarHashExterno } from '../util/hash.util';

const SELECT_FIELDS = `
  u.ID                             AS "id",
  u.NAME                           AS "name",
  u.EMAIL                          AS "email",
  u.TELEFONE                       AS "telefone",
  u.GRAUACADEMICO                  AS "grauacademico",
  u.TIPO_DE_DOCUMENTO              AS "tipo_de_documento",
  td.DESIGNACAO                    AS "tipo_documento_descricao",
  u.NUMERO_DOCUMENTO               AS "numero_documento",
  u.FOTO                           AS "foto",
  u.CREATED_AT                     AS "created_at",
  u.UPDATED_AT                     AS "updated_at",
  u.STATUS_                        AS "status_"
`;

const FROM_CLAUSE = `
  FROM FK2_USERS u
  LEFT JOIN FK2_TB_TIPO_DOCUMENTOS td
    ON td.CODIGO = u.TIPO_DE_DOCUMENTO
`;

@Injectable()
export class PreInscritosService {
  constructor(private readonly dataSource: DataSource) {}

  // ─────────────────────────────────────────────
  //  LISTAR (com paginação dinâmica e filtros)
  // ─────────────────────────────────────────────
  async findAll(query: FindPreInscritoDto) {
    const { page = 1, limit = 10, search, grauacademico, tipoDocumento } =
      query;

    const condicoes: string[] = ['u.STATUS_ = 1'];
    const filterParams: Record<string, any> = {};

    if (search?.trim()) {
      condicoes.push(
        `(UPPER(u.NAME) LIKE UPPER(:search)
          OR UPPER(u.EMAIL) LIKE UPPER(:search)
          OR UPPER(u.TELEFONE) LIKE UPPER(:search)
          OR UPPER(u.NUMERO_DOCUMENTO) LIKE UPPER(:search))`,
      );
      filterParams.search = `%${search.trim()}%`;
    }

    if (grauacademico?.trim()) {
      condicoes.push(`UPPER(u.GRAUACADEMICO) = UPPER(:grauacademico)`);
      filterParams.grauacademico = grauacademico.trim();
    }

    if (tipoDocumento !== undefined && tipoDocumento !== null) {
      condicoes.push(`u.TIPO_DE_DOCUMENTO = :tipoDocumento`);
      filterParams.tipoDocumento = tipoDocumento;
    }

    if (query.anoLectivoId !== undefined && query.anoLectivoId !== null) {
      condicoes.push(`u.ANO_LECTIVO_ID = :anoLectivoId`);
      filterParams.anoLectivoId = query.anoLectivoId;
    }

    const whereClause = condicoes.map((c) => ` AND ${c}`).join('');

    const offset = (page - 1) * limit;
    const queryParams = { ...filterParams, offset, limit };

    const sql = `
      SELECT ${SELECT_FIELDS}
      ${FROM_CLAUSE}
      WHERE 1=1
        ${whereClause}
      ORDER BY u.CREATED_AT DESC
      OFFSET :offset ROWS
      FETCH NEXT :limit ROWS ONLY
    `;

    const countSql = `
      SELECT COUNT(*) AS TOTAL
      ${FROM_CLAUSE}
      WHERE 1=1
        ${whereClause}
    `;

    const [data, countResult] = await Promise.all([
      this.dataSource.query(sql, queryParams as any),
      this.dataSource.query(countSql, filterParams as any),
    ]);

    const total = Number(countResult?.[0]?.TOTAL ?? 0);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────
  //  FIND ONE
  // ─────────────────────────────────────────────
  async findOne(id: number) {
    const rows = await this.dataSource.query(
      `
        SELECT ${SELECT_FIELDS}
        ${FROM_CLAUSE}
        WHERE u.ID = :id
      `,
      { id } as any,
    );

    if (!rows.length) {
      throw new NotFoundException(`Pré-inscrito com ID ${id} não encontrado`);
    }

    return rows[0];
  }

  // ─────────────────────────────────────────────
  //  CREATE
  // ─────────────────────────────────────────────
  async create(dto: CreatePreInscritoDto) {
    await this.assertUniqueEmail(dto.email);
    if (dto.numero_documento) {
      await this.assertUniqueDocument(dto.numero_documento);
    }
    if (dto.telefone) {
      await this.assertUniquePhone(dto.telefone);
    }

    const hashedPassword = await gerarHashExterno(dto.password);

    const result = await this.dataSource.query(
      `
        INSERT INTO FK2_USERS (
          NAME,
          TELEFONE,
          EMAIL,
          TIPO_DE_DOCUMENTO,
          NUMERO_DOCUMENTO,
          PASSWORD,
          CANAL,
          USERNAME,
          GRAUACADEMICO,
          FACULDADE,
          ESTADO,
          FOTO,
          STATUS_,
          ANO_LECTIVO_ID,
          CREATED_AT,
          UPDATED_AT
        ) VALUES (
          :name,
          :telefone,
          :email,
          :tipoDocumento,
          :numeroDocumento,
          :password,
          NULL,
          NULL,
          :grauacademico,
          NULL,
          NULL,
          :foto,
          1,
          NULL,
          SYSDATE,
          SYSDATE
        ) RETURNING ID INTO :outId
      `,
      {
        name: dto.name,
        telefone: dto.telefone ?? null,
        email: dto.email,
        tipoDocumento: dto.tipo_de_documento ?? null,
        numeroDocumento: dto.numero_documento ?? null,
        grauacademico: dto.grauacademico ?? null,
        foto: dto.foto ?? null,
        password: hashedPassword,
        outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      } as any,
    );

    const id = this.unwrapId(result);

    return this.findOne(id);
  }

  // ─────────────────────────────────────────────
  //  UPDATE
  // ─────────────────────────────────────────────
  async update(id: number, dto: UpdatePreInscritoDto) {
    await this.assertExists(id);

    if (dto.email) {
      await this.assertUniqueEmail(dto.email, id);
    }
    if (dto.numero_documento) {
      await this.assertUniqueDocument(dto.numero_documento, id);
    }
    if (dto.telefone) {
      await this.assertUniquePhone(dto.telefone, id);
    }

    let hashedPassword: string | undefined;
    if (dto.password) {
      hashedPassword = await gerarHashExterno(dto.password);
    }

    await this.dataSource.query(
      `
        UPDATE FK2_USERS
           SET NAME              = NVL(:name,           NAME),
               TELEFONE          = NVL(:telefone,       TELEFONE),
               EMAIL             = NVL(:email,          EMAIL),
               TIPO_DE_DOCUMENTO = NVL(:tipoDocumento,  TIPO_DE_DOCUMENTO),
               NUMERO_DOCUMENTO  = NVL(:numeroDocumento, NUMERO_DOCUMENTO),
               GRAUACADEMICO     = NVL(:grauacademico,  GRAUACADEMICO),
               FOTO              = NVL(:foto,           FOTO),
               PASSWORD          = NVL(:password,       PASSWORD),
               UPDATED_AT        = SYSDATE
         WHERE ID = :id
      `,
      {
        name: dto.name ?? null,
        telefone: dto.telefone ?? null,
        email: dto.email ?? null,
        tipoDocumento: dto.tipo_de_documento ?? null,
        numeroDocumento: dto.numero_documento ?? null,
        grauacademico: dto.grauacademico ?? null,
        foto: dto.foto ?? null,
        password: hashedPassword ?? null,
        id,
      } as any,
    );

    return this.findOne(id);
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

    return { message: `Pré-inscrito ${id} removido com sucesso` };
  }

  // ─────────────────────────────────────────────
  //  HELPERS PRIVADOS
  // ─────────────────────────────────────────────
  private unwrapId(result: any): number {
    const raw = result?.outBinds ? result.outBinds[0] : result?.[0];

    const unwrap = (value: unknown): number => {
      if (Array.isArray(value)) {
        return unwrap(value[0]);
      }
      return Number(value);
    };

    const id = unwrap(raw);

    if (!id || Number.isNaN(id)) {
      throw new BadRequestException(
        `Não foi possível obter o ID gerado. Resultado bruto: ${JSON.stringify(result)}`,
      );
    }

    return id;
  }

  private async assertExists(id: number) {
    const rows = await this.dataSource.query(
      `SELECT ID FROM FK2_USERS WHERE ID = :id AND STATUS_ = 1`,
      { id } as any,
    );
    if (!rows.length) {
      throw new NotFoundException(`Pré-inscrito com ID ${id} não encontrado`);
    }
  }

  private async assertUniqueEmail(email: string, excludeId?: number) {
    const rows = await this.dataSource.query(
      `SELECT ID FROM FK2_USERS WHERE UPPER(EMAIL) = UPPER(:email) AND STATUS_ = 1 ${excludeId ? 'AND ID != :excludeId' : ''}`,
      (excludeId ? { email, excludeId } : { email }) as any,
    );
    if (rows.length) {
      throw new ConflictException('Este e-mail já está em uso');
    }
  }

  private async assertUniqueDocument(document: string, excludeId?: number) {
    const rows = await this.dataSource.query(
      `SELECT ID FROM FK2_USERS WHERE UPPER(NUMERO_DOCUMENTO) = UPPER(:document) AND STATUS_ = 1 ${excludeId ? 'AND ID != :excludeId' : ''}`,
      (excludeId ? { document, excludeId } : { document }) as any,
    );
    if (rows.length) {
      throw new ConflictException('Este número de documento já está em uso');
    }
  }

  private async assertUniquePhone(phone: string, excludeId?: number) {
    const rows = await this.dataSource.query(
      `SELECT ID FROM FK2_USERS WHERE UPPER(TELEFONE) = UPPER(:phone) AND STATUS_ = 1 ${excludeId ? 'AND ID != :excludeId' : ''}`,
      (excludeId ? { phone, excludeId } : { phone }) as any,
    );
    if (rows.length) {
      throw new ConflictException('Este telefone já está em uso');
    }
  }
}
