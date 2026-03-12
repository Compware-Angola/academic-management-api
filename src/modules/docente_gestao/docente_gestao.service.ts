import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateDocenteGestaoDto } from './dto/create-docente_gestao.dto';
import { UpdateDocenteGestaoDto } from './dto/update-docente_gestao.dto';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindParametrosDocenteTO } from './dto/find-parametros-docente.dto';
import { FindAfectacaoDTO } from './dto/find-afectacao.dto';
import { UpdateAfectacaoDTO } from './dto/update-afectacao.dto';
import { FindDocenteAfectacaoDTO } from './dto/find-docente-afectacao.dto';

@Injectable()
export class DocenteGestaoService {
  constructor(private readonly dataSource: DataSource) {}
  async getTeacherParameters(dto: FindParametrosDocenteTO) {
    const { page = 1, limit = 10, search } = dto;
    const offset = (page - 1) * limit;

    const baseWhere = `
    ACTIVE_STATE = 1
    ${search ? `AND (DESIGNACAO LIKE '%${search}%' OR SIGLA LIKE '%${search}%')` : ''}
  `;

    const sql = `
    SELECT
      PK_PARAMETRO      AS codigo,
      DESIGNACAO        AS designacao,
      DESCRICAO         AS descricao,
      SIGLA             AS sigla,
      ARGS              AS args,
      OBS               AS observacao,
      ORDEM             AS ordem,
      CREATED_AT        AS created_at,
      UPDATED_AT        AS updated_at
    FROM FK2_MGD_TB_PARAMETRO_AFECTACAO
    WHERE ${baseWhere}
    ORDER BY ORDEM ASC
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    const sqlCount = `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_MGD_TB_PARAMETRO_AFECTACAO
    WHERE ${baseWhere}
  `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql),
      this.dataSource.query(sqlCount),
    ]);

    const total = Number(countResult[0].TOTAL);
    const totalPages = Math.ceil(total / limit);

    return {
      data: await toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages,
    };
  }
  async toggleTeacherParameter(id: number) {
    const sqlFind = `
    SELECT PK_PARAMETRO, ARGS
    FROM FK2_MGD_TB_PARAMETRO_AFECTACAO
    WHERE PK_PARAMETRO = ${id}
  `;

    const result = await this.dataSource.query(sqlFind);

    if (!result.length) {
      throw new Error('Parâmetro não encontrado');
    }

    let args;

    try {
      args = JSON.parse(result[0].ARGS);
    } catch {
      throw new Error('ARGS inválido');
    }

    const currentState = args[0]?.state;
    const newState = currentState === 'SIM' ? 'NAO' : 'SIM';

    args[0].state = newState;

    const updatedArgs = JSON.stringify(args);

    const sqlUpdate = `
    UPDATE FK2_MGD_TB_PARAMETRO_AFECTACAO
    SET
      ARGS = '${updatedArgs}',
      UPDATED_AT = SYSDATE
    WHERE PK_PARAMETRO = ${id}
  `;

    await this.dataSource.query(sqlUpdate);

    return {
      message:
        newState === 'SIM'
          ? 'Parâmetro activado com sucesso'
          : 'Parâmetro desactivado com sucesso',
      state: newState,
    };
  }
  async findAfectacao(filters: FindAfectacaoDTO) {
    const {
      anoLectivo,
      semestre,
      unidadeCurricular,
      curso,
      anoCurricular,
      docente,
      limit = 25,
      page = 1,
    } = filters;

    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any = {};

    conditions.push(`1=1`);
    conditions.push(`an.codigo = :anoLectivo`);
    params.anoLectivo = anoLectivo;

    if (semestre) {
      conditions.push(`s.pk_semestre = :semestre`);
      params.semestre = semestre;
    }

    // opcionais
    if (unidadeCurricular) {
      conditions.push(`g.codigo = :unidadeCurricular`);
      params.unidadeCurricular = unidadeCurricular;
    }
    if (curso) {
      conditions.push(`cu.codigo = :curso`);
      params.curso = curso;
    }
    if (anoCurricular) {
      conditions.push(`a.codigo = :anoCurricular`);
      params.anoCurricular = anoCurricular;
    }

    if (docente) {
      conditions.push(`d.codigo = :docente`);
      params.docente = docente;
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
  SELECT
    af.PK_AFECTACAO                          AS codigo,
    JSON_VALUE(af.ref_ano_lectivo,'$.desc')  AS anoLectivo,
    JSON_VALUE(af.ref_cadeira,'$.desc')      AS uc,
    JSON_VALUE(af.ref_docente,'$.desc')      AS docente,
    d.codigo                                 As codigo_docente,
    ca.designacao                            AS categoria,
    a.designacao                             AS classe,
    s.designacao                             AS semestre,
    cu.designacao                            AS curso,
    af.CREATED_AT                            AS data,
    ur.nome                                  AS afectadoPor,
    af.active_state                          AS estado

  FROM FK2_MGD_TB_DOCENTE_AFECTACAO af

  INNER JOIN FK2_TB_GRADE_CURRICULAR g
    ON g.codigo = JSON_VALUE(af.ref_cadeira,'$.pk')

  INNER JOIN FK2_MGD_TB_DOCENTE d
    ON d.codigo = JSON_VALUE(af.ref_docente,'$.pk')

  INNER JOIN FK2_TB_CLASSES a
    ON a.codigo = g.CODIGO_CLASSE

  INNER JOIN FK2_TB_ANO_LECTIVO an
    ON an.codigo = JSON_VALUE(af.ref_ano_lectivo,'$.pk')

  INNER JOIN FK2_MCAL_TB_SEMESTRE s
    ON s.pk_semestre = g.CODIGO_SEMESTRE

  INNER JOIN FK2_TB_CATEGORIA_DOCENTE ca
    ON ca.codigo = af.FK_CATEGORIA

  INNER JOIN FK2_TB_CURSOS cu
    ON cu.codigo = g.CODIGO_CURSO

  INNER JOIN FK2_MCA_TB_UTILIZADOR ur
    ON ur.pk_utilizador = af.CREATED_BY

  WHERE ${whereClause}

  ORDER BY af.CREATED_AT DESC
  OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;

    const sqlParams = {
      ...params,
      offset,
      limit,
    };

    const sqlCount = `
  SELECT COUNT(*) AS TOTAL

  FROM FK2_MGD_TB_DOCENTE_AFECTACAO af

  INNER JOIN FK2_TB_GRADE_CURRICULAR g
    ON g.codigo = JSON_VALUE(af.ref_cadeira,'$.pk')

  INNER JOIN FK2_MGD_TB_DOCENTE d
    ON d.codigo = JSON_VALUE(af.ref_docente,'$.pk')

  INNER JOIN FK2_TB_CLASSES a
    ON a.codigo = g.CODIGO_CLASSE

  INNER JOIN FK2_TB_ANO_LECTIVO an
    ON an.codigo = JSON_VALUE(af.ref_ano_lectivo,'$.pk')

  INNER JOIN FK2_MCAL_TB_SEMESTRE s
    ON s.pk_semestre = g.CODIGO_SEMESTRE

  INNER JOIN FK2_TB_CATEGORIA_DOCENTE ca
    ON ca.codigo = af.FK_CATEGORIA

  INNER JOIN FK2_TB_CURSOS cu
    ON cu.codigo = g.CODIGO_CURSO

  INNER JOIN FK2_MCA_TB_UTILIZADOR ur
    ON ur.pk_utilizador = af.CREATED_BY

  WHERE ${whereClause}
  `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql, sqlParams),
      this.dataSource.query(sqlCount, params),
    ]);

    const total = Number(countResult[0].TOTAL);
    const totalPages = Math.ceil(total / limit);

    return {
      data: await toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages,
    };
  }
  async obterAnoLectivo(anoLectivoId: number) {
    const sqlAnoLectivo = `
      SELECT
        DATAINICIOPRIMEIROSEMESTRE,
        DATAINICIOSEGUNDOSEMESTRE,
        STATUS_
      FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :anoLectivoId
    `;
    const result = await this.dataSource.query(sqlAnoLectivo, {
      anoLectivoId,
    } as any);

    const row = result?.[0];
    if (!row) {
      throw new BadRequestException('O ano lectivo não encontrado');
    }
    return toLowerCaseKeys(row);
  }
  async updateAfectacaoStatus(codigo: number, params: UpdateAfectacaoDTO) {
    const { status } = params;
    try {
      const sql = `update
                  fk2_mgd_tb_docente_afectacao
                  set active_state = :status
                  where pk_afectacao = :codigo
                  `;
      await this.dataSource.query(sql, {
        codigo,
        status,
      } as any);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async findDocenteAfectacao(filters: FindDocenteAfectacaoDTO) {
    const {
      anoLectivo,
      semestre,
      docente,
      tipoAfectacao,
      dataInicial,
      dataFinal,
      limit = 25,
      page = 1,
    } = filters;

    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any = {};

    conditions.push(`1=1`);
    conditions.push(`a.ACTIVE_STATE = 1`);
    conditions.push(`l.codigo = :anoLectivo`);

    params.anoLectivo = anoLectivo;

    if (semestre) {
      conditions.push(`s.PK_SEMESTRE = :semestre`);
      params.semestre = semestre;
    }

    if (docente) {
      conditions.push(`d.codigo = :docente`);
      params.docente = docente;
    }

    if (dataInicial && dataFinal) {
      conditions.push(`a.CREATED_AT BETWEEN :dataInicial AND :dataFinal`);
      params.dataInicial = dataInicial;
      params.dataFinal = dataFinal;
    }

    const whereClause = conditions.join(' AND ');
    let sqlCommand = '';
    let sqlCount = '';

    if (tipoAfectacao == 1) {
      sqlCommand = `
      SELECT DISTINCT
        JSON_VALUE(a.REF_DOCENTE,'$.desc')  AS docente,
        d.N_MECANOGRAFICO                   AS mecanografico,
        d.codigo                            AS codigo_docente

      FROM FK2_MGD_TB_DOCENTE_AFECTACAO a

      INNER JOIN FK2_MGD_TB_DOCENTE d
        ON d.codigo = JSON_VALUE(a.REF_DOCENTE,'$.pk')

      INNER JOIN FK2_TB_ANO_LECTIVO l
        ON l.codigo = JSON_VALUE(a.REF_ANO_LECTIVO,'$.pk')

      INNER JOIN FK2_MCAL_TB_SEMESTRE s
        ON s.PK_SEMESTRE = a.SEMESTRE

      WHERE ${whereClause}

      ORDER BY JSON_VALUE(a.REF_DOCENTE,'$.desc') ASC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `;

      sqlCount = `
        SELECT COUNT(DISTINCT d.codigo) AS TOTAL

        FROM FK2_MGD_TB_DOCENTE_AFECTACAO a

        INNER JOIN FK2_MGD_TB_DOCENTE d
          ON d.codigo = JSON_VALUE(a.REF_DOCENTE,'$.pk')

        INNER JOIN FK2_TB_ANO_LECTIVO l
          ON l.codigo = JSON_VALUE(a.REF_ANO_LECTIVO,'$.pk')

        INNER JOIN FK2_MCAL_TB_SEMESTRE s
          ON s.PK_SEMESTRE = a.SEMESTRE

        WHERE ${whereClause}
      `;
    } else {
      sqlCommand = `
      select
          json_value(d.CODIGO_UTILIZADOR,'$.desc') as docente,
          d.N_MECANOGRAFICO                        as mecanografico,
          d.codigo                            as codigo_docente
      from FK2_MGD_TB_DOCENTE d
      where 1=1
      and d.codigo not in (
                    select  d.codigo
                    from FK2_MGD_TB_DOCENTE_AFECTACAO a
                    inner join FK2_MGD_TB_DOCENTE     d on d.codigo        = json_value(a.REF_DOCENTE,'$.pk')
                    inner join FK2_TB_ANO_LECTIVO     l on l.codigo        = json_value(a.REF_ANO_LECTIVO,'$.pk')
                    inner join FK2_MCAL_TB_SEMESTRE   s on s.PK_SEMESTRE   = a.SEMESTRE
                    where ${whereClause}
      )
      ORDER BY json_value(d.CODIGO_UTILIZADOR,'$.desc') ASC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `;

      sqlCount = `
        SELECT COUNT(*) AS TOTAL
        FROM FK2_MGD_TB_DOCENTE d
        WHERE 1=1
        AND d.codigo NOT IN (
              SELECT d.codigo
              FROM FK2_MGD_TB_DOCENTE_AFECTACAO a
              INNER JOIN FK2_MGD_TB_DOCENTE d
                  ON d.codigo = JSON_VALUE(a.REF_DOCENTE,'$.pk')
              INNER JOIN FK2_TB_ANO_LECTIVO l
                  ON l.codigo = JSON_VALUE(a.REF_ANO_LECTIVO,'$.pk')
              INNER JOIN FK2_MCAL_TB_SEMESTRE s
                  ON s.PK_SEMESTRE = a.SEMESTRE
              WHERE ${whereClause}
        )
     `;
    }
    const sqlParams = {
      ...params,
      offset,
      limit,
    };
    const [result, countResult] = await Promise.all([
      this.dataSource.query(sqlCommand, sqlParams),
      this.dataSource.query(sqlCount, params),
    ]);

    const total = Number(countResult[0].TOTAL);
    const totalPages = Math.ceil(total / limit);

    return {
      data: await toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages,
    };
  }
}
