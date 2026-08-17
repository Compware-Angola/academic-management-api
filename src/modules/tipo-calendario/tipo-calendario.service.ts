import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as oracledb from 'oracledb';
import { CreateTipoCalendarioDto } from './dto/create-tipo-calendario.dto';
import { UpdateTipoCalendarioDto } from './dto/update-tipo-calendario.dto';
import { TipoCalendario } from './entities/tipo-calendario.entity';
import { FindTipoCalendarioQueryDto } from './dto/find-tipo-calendario.dto';

@Injectable()
export class TipoCalendarioService {
  constructor(
    @InjectRepository(TipoCalendario)
    private readonly repo: Repository<TipoCalendario>,
  ) { }

  async create(dto: CreateTipoCalendarioDto): Promise<TipoCalendario> {
    const queryRunner = this.repo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sql = `
        INSERT INTO FK2_TB_TIPO_CALENDARIO
          (DESIGNACAO, ATIVO_PARA_ALUNO, SIGLA)
        VALUES (:1, :2, :3)
        RETURNING CODIGO INTO :4
      `;

      const result = await queryRunner.query(sql, [
        dto.designacao ?? null,
        dto.ativoParaAluno ?? null,
        dto.sigla ?? null,
        { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }, // constantes reais do driver, não strings
      ]);

      await queryRunner.commitTransaction();

      // node-oracledb devolve outBinds como array (RETURNING pode trazer
      // várias linhas), e o TypeORM pode aninhar mais um nível conforme a
      // versão. Desembrulha recursivamente até sobrar o número.
      const unwrap = (value: unknown): number => {
        if (Array.isArray(value)) {
          return unwrap(value[0]);
        }
        return Number(value);
      };

      const rawCodigo = result?.outBinds ? result.outBinds[0] : result?.[0];

      const codigoGerado = unwrap(rawCodigo);

      if (!codigoGerado || Number.isNaN(codigoGerado)) {
        throw new Error(
          `Não foi possível obter o CODIGO gerado. Resultado bruto: ${JSON.stringify(result)}`,
        );
      }

      return this.findOne(codigoGerado);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(query: FindTipoCalendarioQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('tc')
      .orderBy('tc.designacao', 'ASC');

    if (query.search) {
      qb.andWhere(
        '(UPPER(tc.designacao) LIKE UPPER(:search) OR UPPER(tc.sigla) LIKE UPPER(:search))',
        { search: `%${query.search}%` },
      );
    }

    if (query.ativoParaAluno !== undefined) {
      qb.andWhere('tc.ativoParaAluno = :ativoParaAluno', {
        ativoParaAluno: query.ativoParaAluno,
      });
    }

    const [data, total] = await qb.skip(offset).take(limit).getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(codigo: number): Promise<TipoCalendario> {
    const tipo = await this.repo.findOne({ where: { codigo } });
    if (!tipo) {
      throw new NotFoundException(
        `Tipo de calendário com código ${codigo} não encontrado`,
      );
    }
    return tipo;
  }

  async update(
    codigo: number,
    dto: UpdateTipoCalendarioDto,
  ): Promise<TipoCalendario> {
    const tipo = await this.findOne(codigo);
    Object.assign(tipo, dto);
    return this.repo.save(tipo);
  }
}
