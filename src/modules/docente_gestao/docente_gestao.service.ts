import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateDocenteGestaoDto } from './dto/create-docente_gestao.dto';
import { UpdateDocenteDto } from './dto/update-docente.dto';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindParametrosDocenteTO } from './dto/find-parametros-docente.dto';
import { FindAfectacaoDTO } from './dto/find-afectacao.dto';
import { UpdateAfectacaoDTO } from './dto/update-afectacao.dto';
import { FindDocenteAfectacaoDTO } from './dto/find-docente-afectacao.dto';
import { CreateAfectacaoDTO } from './dto/create-afectaco.dto';

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
    ON g.codigo = af.fk_cadeira

  INNER JOIN FK2_MGD_TB_DOCENTE d
    ON d.codigo = af.fk_docente

  INNER JOIN FK2_TB_CLASSES a
    ON a.codigo = g.CODIGO_CLASSE

  INNER JOIN FK2_TB_ANO_LECTIVO an
    ON an.codigo = af.fk_ano_lectivo

  INNER JOIN FK2_MCAL_TB_SEMESTRE s
    ON s.pk_semestre = g.CODIGO_SEMESTRE

  INNER JOIN FK2_TB_CATEGORIA_DOCENTE ca
    ON ca.codigo = af.FK_CATEGORIA

  INNER JOIN FK2_TB_CURSOS cu
    ON cu.codigo = g.CODIGO_CURSO

  LEFT JOIN FK2_MCA_TB_UTILIZADOR ur
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
    ON g.codigo = af.fk_cadeira

  INNER JOIN FK2_MGD_TB_DOCENTE d
    ON d.codigo = af.fk_docente

  INNER JOIN FK2_TB_CLASSES a
    ON a.codigo = g.CODIGO_CLASSE

  INNER JOIN FK2_TB_ANO_LECTIVO an
    ON an.codigo = af.fk_ano_lectivo

  INNER JOIN FK2_MCAL_TB_SEMESTRE s
    ON s.pk_semestre = g.CODIGO_SEMESTRE

  INNER JOIN FK2_TB_CATEGORIA_DOCENTE ca
    ON ca.codigo = af.FK_CATEGORIA

  INNER JOIN FK2_TB_CURSOS cu
    ON cu.codigo = g.CODIGO_CURSO

  LEFT JOIN FK2_MCA_TB_UTILIZADOR ur
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
  private async obterAnoLectivo(anoLectivoId: number) {
    const sqlAnoLectivo = `
      select
        designacao,
        status_
      from fk2_tb_ano_lectivo where codigo = :anolectivoid
    `;
    const result = await this.dataSource.query(sqlAnoLectivo, {
      anoLectivoId,
    } as any);

    const row = result?.[0];
    if (!row) {
      throw new BadRequestException('O ano lectivo não encontrado');
    }
    return JSON.stringify({
      pk: anoLectivoId,
      desc: row?.DESIGNACAO,
    });
  }
  async getDescricaoGradeCurricular(codigoGrade: number): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT d.designacao
     FROM fk2_tb_grade_curricular gc
     INNER JOIN fk2_tb_disciplinas d ON gc.CODIGO_DISCIPLINA = d.codigo
     WHERE gc.codigo = :codigoGrade`,
      [codigoGrade],
    );

    if (!result || result.length === 0) {
      throw new Error(
        `Descrição da grade curricular não encontrada para o código ${codigoGrade}`,
      );
    }
    return JSON.stringify({
      pk: codigoGrade,
      desc: result[0]?.DESIGNACAO,
    });
  }
  async getNomeDocente(codigoDocente: number): Promise<string> {
    const result = await this.dataSource.query(
      `
  SELECT
    JSON_VALUE(CODIGO_UTILIZADOR, '$.desc') AS "nome"
  FROM FK2_MGD_TB_DOCENTE
  WHERE CODIGO = :codigoDocente
  `,
      [codigoDocente],
    );

    if (!result || result.length === 0) {
      throw new Error(`Descrição do docente não encontrado ${codigoDocente}`);
    }
    return JSON.stringify({
      pk: codigoDocente,
      desc: result[0]?.nome,
    });
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
  async createAfectacao(createdBy: number, dto: CreateAfectacaoDTO) {
    const { anoLectivo, categoria, docente, semestre, unidadeCurricular } = dto;

    //Verificar se a pessoa já tem uma afectação
    const sql1 = `select pk_afectacao
                  from fk2_mgd_tb_docente_afectacao
                  where 1=1
                  and semestre       = :semestre
                  and fk_docente     = :docente
                  and fk_cadeira     = :unidadeCurricular
                  and fk_ano_lectivo = :anoLectivo
                  and active_state = 1
    `;
    const existAfectacaoResultado = await this.dataSource.query(sql1, {
      semestre,
      docente,
      unidadeCurricular,
      anoLectivo,
    } as any);
    try {
      const existAfectacaoRow = existAfectacaoResultado?.[0];
      if (existAfectacaoRow) {
        throw new BadRequestException(
          'Já existe uma afectação com esses dados',
        );
      }
      const obs = '';

      const refAnoLectivo = await this.obterAnoLectivo(anoLectivo);
      const refCadeira =
        await this.getDescricaoGradeCurricular(unidadeCurricular);
      const refDocente = await this.getNomeDocente(docente);

      const sql2 = `
    insert
    into fk2_mgd_tb_docente_afectacao(
      ref_ano_lectivo,
      ref_cadeira,
      ref_docente,
      obs,
      created_by,
      last_updated_by,
      created_at,
      updated_at,
      active_state,
      semestre,
      fk_categoria,
      fk_ano_lectivo,
      fk_cadeira,
      fk_docente
    ) values(
      :refAnoLectivo,
      :refCadeira,
      :refDocente,
      :obs,
      :createdBy,
      :updatedBy,
      sysdate,
      sysdate,
      1,
      :semestre,
      :categoria,
      :anoLectivo,
      :unidadeCurricular,
      :docente
      )
    `;
      await this.dataSource.query(sql2, {
        refAnoLectivo,
        refCadeira,
        refDocente,
        obs,
        createdBy,
        updatedBy: createdBy,
        semestre,
        categoria,
        anoLectivo,
        unidadeCurricular,
        docente,
      } as any);
    } catch (error) {
      throw error;
    }
  }
  // UPDATE DOCENTE
  async updateDocente(codigo: number, dto: UpdateDocenteDto) {
    const fields: string[] = [];
    const params: Record<string, any> = { codigo };

    const docenteActual = await this.dataSource.query(
      `
    SELECT
      CODIGO,
       JSON_VALUE(CODIGO_UTILIZADOR, '$.pk' RETURNING NUMBER) AS UTILIZADOR_PK
    FROM FK2_MGD_TB_DOCENTE
    WHERE CODIGO = :codigo
    `,
      { codigo } as any,
    );
    console.log(docenteActual.length);

    if (docenteActual.length === 0) {
      throw new NotFoundException(
        `Docente com código ${codigo} não encontrado.`,
      );
    }

    const utilizadorPk = docenteActual[0].UTILIZADOR_PK;

    if (!utilizadorPk) {
      throw new BadRequestException(`Docente não possui utilizador associado.`);
    }

    const utilizador = await this.dataSource.query(
      `
    SELECT
      PK_UTILIZADOR AS CODIGO,
      NOME
    FROM FK2_MCA_TB_UTILIZADOR
    WHERE PK_UTILIZADOR = :utilizadorPk
    `,
      { utilizadorPk } as any,
    );

    if (!utilizador || utilizador.length === 0) {
      throw new NotFoundException(
        `Utilizador com código ${utilizadorPk} não encontrado.`,
      );
    }

    const { CODIGO: UTIL_CODIGO, NOME } = utilizador[0];
    const desc = `${NOME}`.trim();
    const refUtilizador = JSON.stringify({ pk: UTIL_CODIGO, desc });

    fields.push('CODIGO_UTILIZADOR = :refUtilizador');
    params.refUtilizador = refUtilizador;

    // Restantes campos
    if (dto.apreciacao !== undefined) {
      fields.push('APRECIACAO = :apreciacao');
      params.apreciacao = dto.apreciacao;
    }
    if (dto.nMecanografico !== undefined) {
      fields.push('N_MECANOGRAFICO = :nMecanografico');
      params.nMecanografico = dto.nMecanografico;
    }
    if (dto.fkEscalao !== undefined) {
      fields.push('FK_ESCALAO = :fkEscalao');
      params.fkEscalao = dto.fkEscalao;
    }
    if (dto.tbCategoriaDocente !== undefined) {
      fields.push('TB_CATEGORIA_DOCENTE = :tbCategoriaDocente');
      params.tbCategoriaDocente = dto.tbCategoriaDocente;
    }
    if (dto.faculdade !== undefined) {
      fields.push('FACULDADE = :faculdade');
      params.faculdade = dto.faculdade;
    }
    if (dto.codigoValidacao !== undefined) {
      fields.push('CODIGO_VALIDACAO = :codigoValidacao');
      params.codigoValidacao = dto.codigoValidacao;
    }
    if (dto.valorHora !== undefined) {
      fields.push('VALOR_HORA = :valorHora');
      params.valorHora = dto.valorHora;
    }
    if (dto.fkCandidatura !== undefined) {
      fields.push('FK_CANDIDATURA = :fkCandidatura');
      params.fkCandidatura = dto.fkCandidatura;
    }
    if (dto.totalAnoExperiencia !== undefined) {
      fields.push('TOTAL_ANO_EXPERIENCIA = :totalAnoExperiencia');
      params.totalAnoExperiencia = dto.totalAnoExperiencia;
    }
    if (dto.dataInicioDocencia !== undefined) {
      fields.push('DATAINICIODOCENCIA = :dataInicioDocencia');
      params.dataInicioDocencia = dto.dataInicioDocencia;
    }
    if (dto.propostaDeContratacao !== undefined) {
      fields.push('PROPOSTA_DE_CONTRATACAO = :propostaDeContratacao');
      params.propostaDeContratacao = dto.propostaDeContratacao;
    }
    if (dto.valorhoraAlt !== undefined) {
      fields.push('VALORHORA = :valorhoraAlt');
      params.valorhoraAlt = dto.valorhoraAlt;
    }
    if (dto.codContrato !== undefined) {
      fields.push('COD_CONTRATO = :codContrato');
      params.codContrato = dto.codContrato;
    }

    fields.push('UPDATED_AT = :updatedAt');
    params.updatedAt = new Date();

    const sql = `
    UPDATE FK2_MGD_TB_DOCENTE
    SET ${fields.join(', \n    ')}
    WHERE CODIGO = :codigo
  `;

    try {
      const result = await this.dataSource.query(sql, params as any);

      return {
        message: 'Docente atualizado com sucesso.',
        codigo,
        utilizadorSincronizado: { pk: UTIL_CODIGO, desc },
        camposAtualizados: fields.length - 1,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Erro ao atualizar docente:', error);
      throw new InternalServerErrorException(
        `Falha ao atualizar docente: ${error.message}`,
      );
    }
  }

  async findByIdDocente(codigo: number): Promise<any> {
    const query = `
    SELECT
      td.CODIGO                     AS codigo,
    --  td.CODIGO_UTILIZADOR          AS codigo_utilizador_json,
      td.N_MECANOGRAFICO            AS n_mecanografico,
      td.FK_ESCALAO                 AS codigo_escalao,
      td.TB_CATEGORIA_DOCENTE       AS codigo_categoria,
      td.FACULDADE                  AS faculdade,
      td.CODIGO_VALIDACAO           AS codigo_validacao,
      td.VALOR_HORA                 AS valor_hora,
      td.CREATED_AT                 AS created_at,
      td.UPDATED_AT                 AS updated_at,
      td.FK_CANDIDATURA             AS fk_candidatura,
      td.TOTAL_ANO_EXPERIENCIA      AS total_ano_experiencia,
      td.DATAINICIODOCENCIA         AS data_inicio_docencia,
      td.PROPOSTA_DE_CONTRATACAO    AS proposta_de_contratacao,
      td.VALORHORA                  AS valorhora,
      td.COD_CONTRATO               AS cod_contrato,
      td.APRECIACAO                 AS apreciacao,
      tu.PK_UTILIZADOR              AS pk_utilizador,
      tu.EMAIL                      AS email,
      tu.USERNAME                   AS username,
      tu.NOME                       AS nome,
      ed.DESIGNACAO                 AS escalao,
      cd.DESIGNACAO                 AS descricao_categoria,
      ga.DESIGNACAO                 AS descricao_grau_academico
    FROM FK2_MGD_TB_DOCENTE td
    INNER JOIN FK2_MCA_TB_UTILIZADOR    tu  ON json_value(td.CODIGO_UTILIZADOR, '$.pk') = tu.PK_UTILIZADOR
    INNER JOIN FK2_TB_ESCALAO_DOCENTE   ed  ON ed.CODIGO  = td.FK_ESCALAO
    INNER JOIN FK2_TB_CATEGORIA_DOCENTE cd  ON cd.CODIGO  = td.TB_CATEGORIA_DOCENTE
    INNER JOIN FK2_MGD_TB_CANDIDATURA   ccc ON ccc.CODIGO = td.FK_CANDIDATURA
    INNER JOIN FK2_TB_GRAU_ACADEMICO    ga  ON ga.CODIGO  = ccc.GRAU_ACADEMICO
    WHERE td.CODIGO = :id
  `;

    const result = await this.dataSource.query(query, [codigo]);

    if (!result || result.length === 0) {
      throw new NotFoundException(`Docente com id ${codigo} não encontrado`);
    }

    return toLowerCaseKeys(result[0]);
  }
}
