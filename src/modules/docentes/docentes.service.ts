import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DataSource } from 'typeorm';
import {
  CreateProgramaUCDTO,
  FindDocenteCadeira,
  FindDocenteUcCurso,
  FindProgramaUCDTO,
} from './dto/find-programa-uc.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindProgramaSemUCDTO } from './dto/find-programa-sem-uc.dto';
import { UpdateProgramaStatusUCDTO } from './dto/update-programa-uc.dto';
import { FindAssiduidadeDTO } from './dto/find-assiduidade.dto';
import { FindHorarioVigilantesCDTO } from './dto/find-horario-vigilantes.dto';
import { FindAfectacaoDTO } from './dto/find-afectacao.dto';
import { UpdateAfectacaoDTO } from './dto/update-afectacao.dto';
import { FindDocenteAfectacaoDTO } from './dto/find-docente-afectacao.dto';

@Injectable()
export class DocentesService {
  constructor(private readonly dataSource: DataSource) {}
  async createProgramaUC(data: CreateProgramaUCDTO) {
    const [academicYear, semestre, docente, gradeCurricular] =
      await Promise.all([
        this.dataSource
          .createQueryBuilder()
          .select('CODIGO, DESIGNACAO')
          .from('FK2_TB_ANO_LECTIVO', 'ano_lectivo')
          .where('CODIGO = :anoLectivo', { anoLectivo: data.anoLectivo })
          .getRawOne(),

        this.dataSource
          .createQueryBuilder()
          .select('*')
          .from('FK2_TB_SEMESTRES', 'semestre')
          .where('CODIGO = :semestre', { semestre: data.semestre })
          .getRawOne(),

        this.dataSource
          .createQueryBuilder()
          .select('CODIGO, CODIGO_UTILIZADOR')
          .from('FK2_MGD_TB_DOCENTE', 'docente')
          .where('CODIGO = :docenteId', { docenteId: data.docenteCode })
          .getRawOne(),

        this.dataSource
          .createQueryBuilder()
          .select(['GRADE.CODIGO AS CODIGO', 'DISC.DESIGNACAO AS DESIGNACAO'])
          .from('FK2_TB_GRADE_CURRICULAR', 'GRADE')
          .innerJoin(
            'FK2_TB_DISCIPLINAS',
            'DISC',
            'DISC.CODIGO = GRADE.CODIGO_DISCIPLINA',
          )
          .where('GRADE.CODIGO = :gradeCurricularId', {
            gradeCurricularId: data.gradeCurricularCode,
          })
          .getRawOne(),
      ]);

    if (!academicYear) {
      throw new NotFoundException('Ano lectivo não encontrado');
    }

    if (!semestre) {
      throw new NotFoundException('Semestre não encontrado');
    }

    if (!docente) {
      throw new NotFoundException('Docente não encontrado');
    }

    if (!gradeCurricular) {
      throw new NotFoundException('Grade curricular não encontrada');
    }

    const refAnoLectivo = this.gernerateRefAnoLectivo(
      toLowerCaseKeys(academicYear),
    );
    const refDocente = this.generateRefDocente(toLowerCaseKeys(docente));
    const refGradeCurricular = this.generateRefGradeCurricular(
      toLowerCaseKeys(gradeCurricular),
    );
    try {
      await this.dataSource
        .createQueryBuilder()
        .insert()
        .into('FK2_MGD_TB_PROGRAMA_UC')
        .values({
          REF_ANO_LECTIVO: refAnoLectivo,
          REF_DOCENTE: refDocente,
          REF_GRADE_CURRICULAR: refGradeCurricular,
          FK_ESTADO_PROGRAMA: 1,
          CREATED_AT: new Date(),
          UPDATED_AT: new Date(),
          ACTIVE_STATE: 1,
          FICHEIRO_NAME: data.ficheiroName,
          FK_ANO_LECTIVO: data.anoLectivo,
          FK_DOCENTE: data.docenteCode,
          FK_GRADE_CURRICULAR: data.gradeCurricularCode,
        })
        .execute();
    } catch (error) {
      throw new BadRequestException(error?.message);
    }

    return {
      message: 'Dados validados com sucesso',
      refAnoLectivo,
      semestre: toLowerCaseKeys(semestre),
      refDocente,
      refGradeCurricular,
    };
  }

  async findProgramaUC(filters: FindProgramaUCDTO) {
    const {
      anoCurricular,
      anoLectivo,
      codigoCurso,
      semestre,
      docenteId,
      unidadeCurricular,
      estado,
      limit = 10,
      page = 1,
    } = filters;

    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any = {};
    conditions.push(`mtpu.active_state = 1`);
    conditions.push(`JSON_VALUE(mtpu.ref_ano_lectivo, '$.pk') = :anoLectivo`);
    params.anoLectivo = anoLectivo;

    conditions.push(`tgc.codigo_classe = :anoCurricular`);
    params.anoCurricular = anoCurricular;

    conditions.push(`tgc.codigo_semestre = :semestre`);
    params.semestre = semestre;

    conditions.push(`tgc.codigo_curso = :codigoCurso`);
    params.codigoCurso = codigoCurso;

    if (docenteId) {
      conditions.push(`JSON_VALUE(mtpu.ref_docente, '$.pk') = :docenteId`);
      params.docenteId = docenteId;
    }
    if (unidadeCurricular) {
      conditions.push(`tgc.codigo = :unidadeCurricular`);
      params.unidadeCurricular = unidadeCurricular;
    }
    if (estado) {
      conditions.push(`mtpu.fk_estado_programa = :estado`);
      params.estado = estado;
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
  SELECT
    mtpu.pk_programa                                   AS codigo,
    JSON_VALUE(mtpu.ref_ano_lectivo,'$.desc')          AS anoLectivo,
    JSON_VALUE(mtpu.ref_docente,'$.desc')              AS docente,
    JSON_VALUE(mtpu.ref_grade_curricular, '$.desc')    AS gradeCurricular,
    estado_uc.designacao                               AS estado,
    estado_uc.pk_estado                                AS codigo_estado,
    mtpu.created_at                                    AS dataCriacao,
    mtpu.updated_at                                    AS dataActualizacao,
    mtpu.ficheiro_name                                 AS arquivo
  FROM fk2_mgd_tb_programa_uc mtpu
  INNER JOIN fk2_tb_grade_curricular tgc
    ON tgc.codigo = JSON_VALUE(mtpu.ref_grade_curricular, '$.pk')
  left join fk2_mgd_estado_programa_uc estado_uc
    on estado_uc.pk_estado = mtpu.fk_estado_programa
  WHERE ${whereClause}
  ORDER BY mtpu.created_at DESC
  OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
`;

    const sqlParams = {
      ...params,
      offset,
      limit,
    };

    const sqlCount = `
  SELECT COUNT(*) AS TOTAL
  FROM FK2_MGD_TB_PROGRAMA_UC mtpu
  INNER JOIN fk2_tb_grade_curricular tgc
    ON tgc.codigo = JSON_VALUE(mtpu.ref_grade_curricular, '$.pk')
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
  async findSemProgramaUC(filters: FindProgramaSemUCDTO) {
    const {
      anoLectivo,
      codigoCurso,
      anoCurricular,
      semestre,
      page = 1,
      limit = 100,
    } = filters;

    const offset = (page - 1) * limit;

    const baseWhere = `
    g.codigo NOT IN (
      SELECT JSON_VALUE(mtpu.ref_grade_curricular, '$.pk')
      FROM FK2_MGD_TB_PROGRAMA_UC mtpu
      WHERE 1=1
      and JSON_VALUE(mtpu.ref_ano_lectivo, '$.pk') = ${anoLectivo}
      and mtpu.active_state = 1
    )
    AND g.codigo_curso = ${codigoCurso}
    AND g.codigo_classe = ${anoCurricular}
    AND g.codigo_semestre = ${semestre}
    AND g.status_ = 1
  `;

    const sql = `
    SELECT DISTINCT
      g.codigo                AS codigo,
      d.designacao            AS disciplina,
      s.designacao            AS semestre,
      c.designacao            AS curso,
      an.designacao           As ano_lectivo
    FROM FK2_TB_GRADE_CURRICULAR g
    INNER JOIN FK2_TB_CURSOS c
      ON c.codigo = g.codigo_curso
    INNER JOIN FK2_MCAL_TB_SEMESTRE s
      ON s.pk_semestre = g.codigo_semestre
    INNER JOIN FK2_TB_DISCIPLINAS d
      ON d.codigo = g.codigo_disciplina
    LEFT JOIN FK2_TB_ANO_LECTIVO an
      ON an.codigo = ${anoLectivo}
    WHERE ${baseWhere}
    ORDER BY g.codigo ASC
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    const sqlCount = `
    SELECT COUNT(DISTINCT g.codigo) AS TOTAL
    FROM FK2_TB_GRADE_CURRICULAR g
    INNER JOIN FK2_TB_CURSOS c
      ON c.codigo = g.codigo_curso
    INNER JOIN FK2_MCAL_TB_SEMESTRE s
      ON s.pk_semestre = g.codigo_semestre
    INNER JOIN FK2_TB_DISCIPLINAS d
      ON d.codigo = g.codigo_disciplina
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

  async findCursos(docenteId: string, query: FindDocenteUcCurso) {
    const { anoLectivo } = query;
    const sql = `
           SELECT DISTINCT
             c.codigo,
             c.designacao
          FROM fk2_mgd_tb_docente_afectacao mtda
          INNER JOIN FK2_TB_GRADE_CURRICULAR g
                  ON g.codigo = JSON_VALUE(mtda.REF_CADEIRA, '$.pk')
          INNER JOIN FK2_TB_CURSOS c
                  ON c.codigo = g.CODIGO_CURSO
          WHERE 1=1
          and  JSON_VALUE(mtda.REF_DOCENTE, '$.pk') = :docenteId
          and  mtda.FK_ANO_LECTIVO = :anoLectivo
  `;

    const result = await this.dataSource.query(sql, [docenteId, anoLectivo]);

    return {
      data: toLowerCaseKeys(result),
    };
  }

  async findCadeiras(filters: FindDocenteCadeira) {
    const { docenteId, cursoId, classeId, semestreId, anoLectivo } = filters;

    const sql = `
    SELECT DISTINCT
       g.codigo,
       JSON_VALUE(mtda.REF_CADEIRA, '$.desc') AS nome_cadeira,
       g.CODIGO_CLASSE
FROM fk2_mgd_tb_docente_afectacao mtda
INNER JOIN FK2_TB_GRADE_CURRICULAR g
        ON g.codigo = JSON_VALUE(mtda.REF_CADEIRA, '$.pk')
WHERE JSON_VALUE(mtda.REF_DOCENTE, '$.pk') = :docenteId
  AND g.CODIGO_CURSO = :cursoId
  AND g.CODIGO_CLASSE = :classeId
  AND g.CODIGO_SEMESTRE = : semestreId
  AND mtda.FK_ANO_LECTIVO = :anoLectivo
  `;

    const result = await this.dataSource.query(sql, [
      docenteId,
      cursoId,
      classeId,
      semestreId,
      anoLectivo,
    ]);

    return {
      data: toLowerCaseKeys(result),
    };
  }

  async findAssiduidadeDocente(docenteId: number, filters: FindAssiduidadeDTO) {
    const {
      gradeId,
      estadoAgendamento,
      dataInicio,
      dataFim,
      anoLectivo = 0,
      semestre = 0,
      page = 1,
      limit = 20,
    } = filters;
    const offset = (page - 1) * limit;

    // Definição das colunas para evitar o "..."

    // No seu DocentesService:

    const hasDates = dataInicio && dataFim;
    // 1. Defina apenas o corpo da consulta (Colunas e FROM)
    const columns = `
    aa.PK_AGENDAMENTO_AULA AS "Codigo",
    TO_CHAR(aa.DATA_AULA, 'YYYY-MM-DD') AS "data_aula",
    estado.DESIGNACAO AS "estado",
    JSON_VALUE(aa.REF_AULA, '$.nomeDocente') AS "Docente",
    al.ORDEM AS "ordem_tempo",
    c2.DESIGNACAO AS "curso",
    d.DESIGNACAO AS "unidade_curricular",
    TO_CHAR(al.HORA_INICIO, 'HH24:MI') AS "hora_inicio",
    TO_CHAR(al.HORA_TERMINO, 'HH24:MI') AS "hora_termino"
  `;

    const fromWhere = `
    FROM FK2_MSA_TB_AGENDAMENTO_AULA aa
    INNER JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO estado ON aa.FK_ESTADO_AGENDAMENTO = estado.PK_ESTADO_AGENDAMENTO
    INNER JOIN FK2_MGH_TB_AULA al ON JSON_VALUE(aa.REF_AULA, '$.pkAula') = al.PK_AULA
    INNER JOIN FK2_MGH_TB_HORARIO h ON al.FK_HORARIO = h.PK_HORARIO
    INNER JOIN FK2_TB_GRADE_CURRICULAR gc ON aa.FK_GRADE_CURRICULAR = gc.CODIGO
    LEFT JOIN FK2_TB_DISCIPLINAS d ON gc.CODIGO_DISCIPLINA = d.CODIGO
    LEFT JOIN FK2_TB_CURSOS c2 ON gc.CODIGO_CURSO = c2.CODIGO
    WHERE aa.ACTIVE_STATE = 1
      AND (TO_NUMBER(JSON_VALUE(aa.REF_AULA, '$.pkDocente')) = :d1 OR :d2 = 0)
      AND (TO_NUMBER(JSON_VALUE(aa.REF_AULA, '$.pkGrade')) = :g1 OR :g2 = 0)
      AND (aa.FK_ESTADO_AGENDAMENTO = :e1 OR :e2 = 0)
      AND (h.FK_ANO_LECTIVO = :a1 OR :a2 = 0)
      AND (h.FK_SEMESTRE = :s1 OR :s2 = 0)
     AND (:hasDate = 0 OR aa.DATA_AULA BETWEEN TO_DATE(:dataInicio, 'YYYY-MM-DD') AND TO_DATE(:dataFim, 'YYYY-MM-DD'))
      AND aa.DATA_AULA <= TRUNC(SYSDATE)
  `;

    // 2. Monte o SQL final sem duplicar SELECT
    const sql = `SELECT DISTINCT ${columns} ${fromWhere} ORDER BY "data_aula" ASC, "ordem_tempo" ASC OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`;
    const countSql = `SELECT COUNT(DISTINCT aa.PK_AGENDAMENTO_AULA) AS TOTAL ${fromWhere}`;

    const filterParams = {
      d1: docenteId || 0,
      d2: docenteId || 0,
      g1: gradeId || 0,
      g2: gradeId || 0,
      e1: estadoAgendamento || 0,
      e2: estadoAgendamento || 0,
      a1: anoLectivo || 0,
      a2: anoLectivo || 0,
      s1: semestre || 0,
      s2: semestre || 0,
      hasDate: hasDates ? 1 : 0, // Flag: 1 para usar data, 0 para ignorar
      dataInicio: dataInicio || '1900-01-01', // Valores dummy se não houver data
      dataFim: dataFim || '2100-01-01',
    };
    const sqlParams = {
      ...filterParams,
      offset,
      limit,
    };

    const [records, countResult] = await Promise.all([
      this.dataSource.query(sql, sqlParams as any),
      this.dataSource.query(countSql, filterParams as any),
    ]);
    const total = Number(countResult[0]?.TOTAL || 0);
    return {
      data: toLowerCaseKeys(records),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  public async updateProgramaStatus(
    codigoPrograma: number,
    payload: UpdateProgramaStatusUCDTO,
  ) {
    const { estado } = payload;
    const sqlEstados = `
      select pk_estado
      from fk2_mgd_estado_programa_uc
      where 1=1
      and pk_estado = :estado
    `;
    const resultado = await this.dataSource.query(sqlEstados, {
      estado,
    } as any);
    if (!resultado) {
      throw new BadRequestException('Estado não encontrado');
    }
    try {
      const sql = `update
                  fk2_mgd_tb_programa_uc
                  set fk_estado_programa = :estado
                  where pk_programa = :codigoPrograma
                  `;
      await this.dataSource.query(sql, {
        codigoPrograma,
        estado,
      } as any);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  public async updateProgramaVisibilidade(
    codigoPrograma: number,
    payload: UpdateProgramaStatusUCDTO,
  ) {
    const { estado } = payload;
    try {
      const sql = `update
                  fk2_mgd_tb_programa_uc
                  set active_state = :estado
                  where pk_programa = :codigoPrograma
                  `;
      await this.dataSource.query(sql, {
        codigoPrograma,
        estado,
      } as any);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  private gernerateRefAnoLectivo(data: any) {
    return JSON.stringify({
      pk: data.codigo,
      desc: data.designacao,
    });
  }

  private generateRefDocente(data: any) {
    const docenteParsed = JSON.parse(data.codigo_utilizador);
    return JSON.stringify({
      pk: data.codigo,
      desc: docenteParsed.desc,
    });
  }

  private generateRefGradeCurricular(data: any) {
    return JSON.stringify({
      pk: data.codigo,
      desc: data.designacao,
    });
  }
  async findHorarioVigilantes(filters: FindHorarioVigilantesCDTO) {
    const {
      vigilanteId,
      periodoId,
      prazoId,
      estado,
      limit = 10,
      page = 1,
    } = filters;

    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any = {};

    conditions.push(`1=1`);

    if (vigilanteId) {
      conditions.push(`JSON_VALUE(cv.ref_vigilante,'$.pk') = :vigilanteId`);
      params.vigilanteId = vigilanteId;
    }

    if (periodoId) {
      conditions.push(`cp.codigo_periodo = :periodoId`);
      params.periodoId = periodoId;
    }

    if (prazoId) {
      conditions.push(`JSON_VALUE(cp.ref_prazo,'$.pk_prazo') = :prazoId`);
      params.prazoId = prazoId;
    }

    if (estado) {
      conditions.push(`es.pk_estado_agendamento = :estado`);
      params.estado = estado;
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
    SELECT
      JSON_VALUE(cp.ref_horario,'$.desc')        AS horario,
      TO_CHAR(cp.hora_termino,'hh24:mi:ss')      AS horaTermino,
      TO_CHAR(cp.hora_prova,'hh24:mi:ss')        AS horaProva,
      cp.data_prova                              AS dataProva,
      d.designacao                               AS disciplina,
      s.designacao                               AS sala,
      JSON_VALUE(cv.ref_vigilante,'$.desc')      AS docente,
      es.designacao                              AS estado
    FROM FK2_TB_CALENDARIO_PROVA_VIGILANTE cv
    INNER JOIN FK2_TB_CALENDARIO_PROVA cp
      ON cv.calendario_prova = cp.codigo
    INNER JOIN FK2_MCAL_TB_PRAZO pz
      ON pz.pk_prazo = JSON_VALUE(cp.ref_prazo,'$.pk_prazo')
    LEFT JOIN FK2_TB_SALAS s
      ON s.codigo = cp.codigo_sala
    LEFT JOIN FK2_TB_DISCIPLINAS d
      ON d.codigo = cp.codigo_disciplina
    LEFT JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO es
      ON es.pk_estado_agendamento = cv.estado_agendamento
    WHERE ${whereClause}
    ORDER BY cv.calendario_prova
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;

    const sqlParams = {
      ...params,
      offset,
      limit,
    };

    const sqlCount = `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_TB_CALENDARIO_PROVA_VIGILANTE cv
    INNER JOIN FK2_TB_CALENDARIO_PROVA cp
      ON cv.calendario_prova = cp.codigo
    INNER JOIN FK2_MCAL_TB_PRAZO pz
      ON pz.pk_prazo = JSON_VALUE(cp.ref_prazo,'$.pk_prazo')
    LEFT JOIN FK2_TB_SALAS s
      ON s.codigo = cp.codigo_sala
    LEFT JOIN FK2_TB_DISCIPLINAS d
      ON d.codigo = cp.codigo_disciplina
    LEFT JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO es
      ON es.pk_estado_agendamento = cv.estado_agendamento
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
  async findDocenteAfectacao(filters: FindDocenteAfectacaoDTO) {}
}
