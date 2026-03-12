import { Injectable } from '@nestjs/common';
import { CreateDocenteGestaoDto } from './dto/create-docente_gestao.dto';
import { UpdateDocenteGestaoDto } from './dto/update-docente_gestao.dto';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FilterDocenteDto } from './dto/filter-docente.dto';

@Injectable()
export class DocenteGestaoService {
    constructor(private readonly dataSource: DataSource) {}
  create(createDocenteGestaoDto: CreateDocenteGestaoDto) {
    return 'This action adds a new docenteGestao';
  }

  findAll() {
    return `This action returns all docenteGestao`;
  }

  findOne(id: number) {
    return `This action returns a #${id} docenteGestao`;
  }

  update(id: number, updateDocenteGestaoDto: UpdateDocenteGestaoDto) {
    return `This action updates a #${id} docenteGestao`;
  }

  remove(id: number) {
    return `This action removes a #${id} docenteGestao`;
  }

   async listDocentes(filter: FilterDocenteDto) {
  const { page = 1, limit = 25, area, search } = filter;
  const offset = (page - 1) * limit;

  const params: Record<string, any> = {
    offset,
    limit_plus_offset: offset + limit,
  };

  const countParams: Record<string, any> = {};

  let whereClause = 'WHERE 1 = 1';

  // filtro por área de formação
  if (area !== undefined && area !== null && area !== 0) {
    whereClause += ' AND fa.AREA_FORMACAO_ID = :area';
    params.area = area;
    countParams.area = area;
  }

  // filtro de pesquisa
  if (search && search.trim()) {
    const term = `%${search.trim().toUpperCase()}%`;

    whereClause += `
      AND (
        UPPER(u.NOME) LIKE :search
        OR UPPER(u.EMAIL) LIKE :search
        OR UPPER(d.N_MECANOGRAFICO) LIKE :search
        OR UPPER(esc.DESIGNACAO) LIKE :search
        OR UPPER(cat.DESIGNACAO) LIKE :search
        OR UPPER(grau."Designacao") LIKE :search
      )
    `;

    params.search = term;
    countParams.search = term;
  }

  const countSql = `
    SELECT COUNT(DISTINCT d.CODIGO) AS total
    FROM FK2_MGD_TB_DOCENTE d
    LEFT JOIN FK2_MGD_TB_CANDIDATURA c
      ON c.CODIGO = d.FK_CANDIDATURA
    LEFT JOIN FK2_MGD_TB_FORMACAO_ACADEMICA fa
      ON fa.FK_CANDIDATURA = c.CODIGO
    LEFT JOIN FK2_MCA_TB_UTILIZADOR u
      ON u.PK_UTILIZADOR = JSON_VALUE(d.CODIGO_UTILIZADOR, '$.pk')
    LEFT JOIN FK2_TB_ESCALAO_DOCENTE esc
      ON esc.CODIGO = d.FK_ESCALAO
    LEFT JOIN FK2_TB_CATEGORIA_DOCENTE cat
      ON cat.CODIGO = d.TB_CATEGORIA_DOCENTE
    LEFT JOIN UMA_TB_GRAU_ACADEMICO grau
      ON grau."Codigo" = c.GRAU_ACADEMICO
    ${whereClause}
  `;

  const countResult = await this.dataSource.query(countSql, countParams as any);
  const total = Number(countResult[0]?.TOTAL ?? 0);

  const dataSql = `
    SELECT *
    FROM (
      SELECT
        d.N_MECANOGRAFICO AS numero_mec,
        u.NOME AS nome,
        u.EMAIL AS email,
        esc.DESIGNACAO AS escalao,
        cat.DESIGNACAO AS categoria,
        grau."Designacao" AS grau_academico,
        fa.AREA_FORMACAO_ID AS area_formacao_id,
        ROW_NUMBER() OVER (ORDER BY u.NOME ASC) AS rn
      FROM FK2_MGD_TB_DOCENTE d
      LEFT JOIN FK2_MGD_TB_CANDIDATURA c
        ON c.CODIGO = d.FK_CANDIDATURA
      LEFT JOIN FK2_MGD_TB_FORMACAO_ACADEMICA fa
        ON fa.FK_CANDIDATURA = c.CODIGO
      LEFT JOIN FK2_MCA_TB_UTILIZADOR u
        ON u.PK_UTILIZADOR = JSON_VALUE(d.CODIGO_UTILIZADOR, '$.pk')
      LEFT JOIN FK2_TB_ESCALAO_DOCENTE esc
        ON esc.CODIGO = d.FK_ESCALAO
      LEFT JOIN FK2_TB_CATEGORIA_DOCENTE cat
        ON cat.CODIGO = d.TB_CATEGORIA_DOCENTE
      LEFT JOIN UMA_TB_GRAU_ACADEMICO grau
        ON grau."Codigo" = c.GRAU_ACADEMICO
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
