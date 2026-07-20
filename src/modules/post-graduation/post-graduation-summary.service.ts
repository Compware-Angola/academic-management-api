import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { CreateSumarioDto } from '../sumario/dto/create-sumario.dto';
import { UpdateSumarioDto } from '../sumario/dto/update-sumario.dto';
import { FindPostGraduationSummariesDto } from './dto/find-summaries.dto';
import { FindPostGraduationSummaryScheduledClassesDto } from './dto/find-summary-scheduled-classes.dto';

type DatabaseRow = Record<string, unknown>;

@Injectable()
export class PostGraduationSummaryService {
  constructor(private readonly dataSource: DataSource) {}

  async findScheduledClasses(filters: FindPostGraduationSummaryScheduledClassesDto) {
    const {
      docente = 0,
      unidadeCurricular = 0,
      dataInicial,
      dataFinal,
      estado = 0,
      anoLectivo = 0,
      semestre = 0,
      degreeId,
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;
    const params: Record<string, unknown> = { dataInicial, dataFinal };
    const conditions = [
      'AA.ACTIVE_STATE = 1',
      'AA.DATA_AULA BETWEEN :dataInicial AND :dataFinal',
      'C.TIPO_CANDIDATURA IN (2, 3)',
      'C.STATUS_ = 1',
      'GC.STATUS_ = 1',
    ];

    if (degreeId) {
      conditions.push('C.TIPO_CANDIDATURA = :degreeId');
      params.degreeId = degreeId;
    }

    if (docente !== 0) {
      conditions.push("JSON_VALUE(AA.REF_AULA, '$.pkDocente') = :docente");
      params.docente = docente;
    }

    if (unidadeCurricular !== 0) {
      conditions.push('GC.CODIGO = :unidadeCurricular');
      params.unidadeCurricular = unidadeCurricular;
    }

    if (estado !== 0) {
      conditions.push('AA.FK_ESTADO_AGENDAMENTO = :estado');
      params.estado = estado;
    }

    if (anoLectivo !== 0) {
      conditions.push('H.FK_ANO_LECTIVO = :anoLectivo');
      params.anoLectivo = anoLectivo;
    }

    if (semestre !== 0) {
      conditions.push('H.FK_SEMESTRE = :semestre');
      params.semestre = semestre;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const fromClause = `
      FROM FK2_MSA_TB_AGENDAMENTO_AULA AA
      INNER JOIN FK2_MGH_TB_AULA AL
        ON JSON_VALUE(AA.REF_AULA, '$.pkAula' RETURNING NUMBER NULL ON ERROR) = AL.PK_AULA
      LEFT JOIN FK2_MGD_TB_DOCENTE DOC
        ON JSON_VALUE(AA.REF_AULA, '$.pkDocente' RETURNING NUMBER NULL ON ERROR) = DOC.CODIGO
      LEFT JOIN FK2_MCA_TB_UTILIZADOR U
        ON JSON_VALUE(DOC.CODIGO_UTILIZADOR, '$.pk' RETURNING NUMBER NULL ON ERROR) = U.PK_UTILIZADOR
      INNER JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO EST
        ON AA.FK_ESTADO_AGENDAMENTO = EST.PK_ESTADO_AGENDAMENTO
      INNER JOIN FK2_MGH_TB_HORARIO H
        ON AL.FK_HORARIO = H.PK_HORARIO
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON AA.FK_GRADE_CURRICULAR = GC.CODIGO
      INNER JOIN FK2_TB_CURSOS C
        ON GC.CODIGO_CURSO = C.CODIGO
      INNER JOIN FK2_TB_SALAS SA
        ON JSON_VALUE(AL.REF_SALA, '$.pk' RETURNING NUMBER NULL ON ERROR) = SA.CODIGO
      INNER JOIN FK2_MGH_TB_TIPO_AULA TA
        ON TA.PK_TIPO_AULA = AL.FK_TIPO_AULA
      INNER JOIN FK2_MGH_TB_DIA_DA_SEMANA DS
        ON DS.PK_DIA_DA_SEMANA = AL.FK_DIA_DA_SEMANA
      INNER JOIN FK2_MGH_TB_MODALIDADE M
        ON M.PK_MODALIDADE = AL.FK_MODALIDADE
      LEFT JOIN FK2_TB_DISCIPLINAS D
        ON GC.CODIGO_DISCIPLINA = D.CODIGO
      LEFT JOIN FK2_TB_CLASSES CL
        ON GC.CODIGO_CLASSE = CL.CODIGO
      LEFT JOIN FK2_MSA_TB_SUMARIO S
        ON S.FK_AGENDAMENTO_AULA = AA.PK_AGENDAMENTO_AULA
       AND S.ACTIVE_STATE = 1
      LEFT JOIN FK2_TB_ESTADO_SUMARIO ES
        ON S.FK_ESTADO_SUMARIO = ES.CODIGO
      ${whereClause}
    `;

    const dataSql = `
      SELECT DISTINCT
        AA.PK_AGENDAMENTO_AULA AS CODIGO,
        C.DESIGNACAO AS CURSO,
        DBMS_LOB.SUBSTR(D.DESIGNACAO, 4000, 1) AS UNIDADE_CURRICULAR,
        TA.DESIGNACAO AS TIPO_AULA,
        AL.ORDEM AS ORDEM_TEMPO,
        TO_CHAR(AA.DATA_AULA, 'YYYY-MM-DD') AS DATA_AULA,
        TO_CHAR(AL.HORA_INICIO, 'HH24:MI') AS HORA_INICIO,
        TO_CHAR(AL.HORA_TERMINO, 'HH24:MI') AS HORA_FIM,
        AA.FK_ESTADO_AGENDAMENTO AS ESTADO_AGENDAMENTO_AULA,
        EST.DESIGNACAO AS ESTADO_AGENDAMENTO_AULA_DESIGNACAO,
        H.DESIGNACAO AS HORARIO,
        SA.DESIGNACAO AS SALA,
        CL.DESIGNACAO AS CLASSE,
        M.DESIGNACAO AS MODALIDADE,
        DS.DESIGNACAO AS DIA_SEMANA,
        S.PK_TB_SUMARIO AS SUMARIO_CODIGO,
        S.DESCRICAO AS SUMARIO_DESCRICAO,
        S.FK_ESTADO_SUMARIO AS SUMARIO_ESTADO,
        ES.DESIGNACAO AS SUMARIO_ESTADO_DESIGNACAO,
        S.CREATED_AT AS SUMARIO_DATA_CRIACAO,
        S.UPDATED_AT AS SUMARIO_DATA_ATUALIZACAO,
        U.NOME AS DOCENTE
      ${fromClause}
      ORDER BY AA.PK_AGENDAMENTO_AULA ASC
      OFFSET :rowOffset ROWS FETCH NEXT :rowLimit ROWS ONLY
    `;

    const countSql = `
      SELECT COUNT(DISTINCT AA.PK_AGENDAMENTO_AULA) AS TOTAL
      ${fromClause}
    `;

    const [rows, countRows] = await Promise.all([
      this.dataSource.query<DatabaseRow[]>(dataSql, {
        ...params,
        rowOffset: offset,
        rowLimit: limit,
      } as any),
      this.dataSource.query<DatabaseRow[]>(countSql, params as any),
    ]);

    const total = Number(countRows[0]?.TOTAL ?? 0);

    return {
      data: toLowerCaseKeys(rows),
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 1,
    };
  }

  async findAll(filters: FindPostGraduationSummariesDto) {
    const {
      docente = 0,
      unidadeCurricular = 0,
      dataInicial,
      dataFinal,
      estado_sumario = 0,
      anoLectivo = 0,
      semestre = 0,
      degreeId,
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;
    const params: Record<string, unknown> = {};
    const conditions = [
      'S.ACTIVE_STATE = 1',
      'AA.ACTIVE_STATE = 1',
      'C.TIPO_CANDIDATURA IN (2, 3)',
      'C.STATUS_ = 1',
      'GC.STATUS_ = 1',
    ];

    if (dataInicial && dataFinal) {
      conditions.push('AA.DATA_AULA BETWEEN :dataInicial AND :dataFinal');
      params.dataInicial = dataInicial;
      params.dataFinal = dataFinal;
    }

    if (degreeId) {
      conditions.push('C.TIPO_CANDIDATURA = :degreeId');
      params.degreeId = degreeId;
    }

    if (docente !== 0) {
      conditions.push("JSON_VALUE(AA.REF_AULA, '$.pkDocente' RETURNING NUMBER NULL ON ERROR) = :docente");
      params.docente = docente;
    }

    if (unidadeCurricular !== 0) {
      conditions.push('GC.CODIGO = :unidadeCurricular');
      params.unidadeCurricular = unidadeCurricular;
    }

    if (estado_sumario !== 0) {
      conditions.push('S.FK_ESTADO_SUMARIO = :estado_sumario');
      params.estado_sumario = estado_sumario;
    }

    if (anoLectivo !== 0) {
      conditions.push('H.FK_ANO_LECTIVO = :anoLectivo');
      params.anoLectivo = anoLectivo;
    }

    if (semestre !== 0) {
      conditions.push('H.FK_SEMESTRE = :semestre');
      params.semestre = semestre;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const fromClause = `
      FROM FK2_MSA_TB_SUMARIO S
      INNER JOIN FK2_MSA_TB_AGENDAMENTO_AULA AA
        ON S.FK_AGENDAMENTO_AULA = AA.PK_AGENDAMENTO_AULA
      INNER JOIN FK2_MGH_TB_AULA AL
        ON JSON_VALUE(AA.REF_AULA, '$.pkAula' RETURNING NUMBER NULL ON ERROR) = AL.PK_AULA
      LEFT JOIN FK2_MGD_TB_DOCENTE DOC
        ON JSON_VALUE(AA.REF_AULA, '$.pkDocente' RETURNING NUMBER NULL ON ERROR) = DOC.CODIGO
      INNER JOIN FK2_MSA_TB_ESTADO_AGENDAMENTO EST
        ON AA.FK_ESTADO_AGENDAMENTO = EST.PK_ESTADO_AGENDAMENTO
      INNER JOIN FK2_MGH_TB_HORARIO H
        ON AL.FK_HORARIO = H.PK_HORARIO
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON AA.FK_GRADE_CURRICULAR = GC.CODIGO
      INNER JOIN FK2_TB_CURSOS C
        ON GC.CODIGO_CURSO = C.CODIGO
      INNER JOIN FK2_TB_SALAS SA
        ON JSON_VALUE(AL.REF_SALA, '$.pk' RETURNING NUMBER NULL ON ERROR) = SA.CODIGO
      INNER JOIN FK2_MGH_TB_TIPO_AULA TA
        ON TA.PK_TIPO_AULA = AL.FK_TIPO_AULA
      INNER JOIN FK2_MGH_TB_DIA_DA_SEMANA DS
        ON DS.PK_DIA_DA_SEMANA = AL.FK_DIA_DA_SEMANA
      INNER JOIN FK2_MGH_TB_MODALIDADE M
        ON M.PK_MODALIDADE = AL.FK_MODALIDADE
      LEFT JOIN FK2_TB_DISCIPLINAS D
        ON GC.CODIGO_DISCIPLINA = D.CODIGO
      LEFT JOIN FK2_TB_CLASSES CL
        ON GC.CODIGO_CLASSE = CL.CODIGO
      LEFT JOIN FK2_TB_ESTADO_SUMARIO ES
        ON S.FK_ESTADO_SUMARIO = ES.CODIGO
      ${whereClause}
    `;

    const dataSql = `
      SELECT DISTINCT
        S.PK_TB_SUMARIO AS SUMARIO_CODIGO,
        S.DESCRICAO AS SUMARIO_DESCRICAO,
        S.FK_ESTADO_SUMARIO AS SUMARIO_ESTADO,
        ES.DESIGNACAO AS SUMARIO_ESTADO_DESIGNACAO,
        S.CREATED_AT AS SUMARIO_DATA_CRIACAO,
        S.UPDATED_AT AS SUMARIO_DATA_ATUALIZACAO,
        AA.PK_AGENDAMENTO_AULA AS CODIGO,
        C.DESIGNACAO AS CURSO,
        DBMS_LOB.SUBSTR(D.DESIGNACAO, 4000, 1) AS UNIDADE_CURRICULAR,
        TA.DESIGNACAO AS TIPO_AULA,
        AL.ORDEM AS ORDEM_TEMPO,
        TO_CHAR(AA.DATA_AULA, 'YYYY-MM-DD') AS DATA_AULA,
        TO_CHAR(AL.HORA_INICIO, 'HH24:MI') AS HORA_INICIO,
        TO_CHAR(AL.HORA_TERMINO, 'HH24:MI') AS HORA_FIM,
        AA.FK_ESTADO_AGENDAMENTO AS ESTADO_AGENDAMENTO_AULA,
        EST.DESIGNACAO AS ESTADO_AGENDAMENTO_AULA_DESIGNACAO,
        H.DESIGNACAO AS HORARIO,
        SA.DESIGNACAO AS SALA,
        CL.DESIGNACAO AS CLASSE,
        M.DESIGNACAO AS MODALIDADE,
        DS.DESIGNACAO AS DIA_SEMANA,
        JSON_VALUE(AL.REF_DOCENTE, '$.nome') AS DOCENTE
      ${fromClause}
      ORDER BY S.PK_TB_SUMARIO ASC
      OFFSET :rowOffset ROWS FETCH NEXT :rowLimit ROWS ONLY
    `;

    const countSql = `
      SELECT COUNT(DISTINCT S.PK_TB_SUMARIO) AS TOTAL
      ${fromClause}
    `;

    const [rows, countRows] = await Promise.all([
      this.dataSource.query<DatabaseRow[]>(dataSql, {
        ...params,
        rowOffset: offset,
        rowLimit: limit,
      } as any),
      this.dataSource.query<DatabaseRow[]>(countSql, params as any),
    ]);

    const total = Number(countRows[0]?.TOTAL ?? 0);

    return {
      data: toLowerCaseKeys(rows),
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 1,
    };
  }

  async findGeneralControl(filters: FindPostGraduationSummaryScheduledClassesDto) {
    const {
      docente = 0,
      dataInicial,
      dataFinal,
      anoLectivo = 0,
      semestre = 0,
      degreeId,
      page = 1,
      limit = 20,
    } = filters;

    const offset = (page - 1) * limit;
    const params: Record<string, unknown> = { dataInicial, dataFinal };
    const conditions = [
      'AA.ACTIVE_STATE = 1',
      "NVL(EW.SIGLA, '-') != 'ab'",
      'AA.DATA_AULA BETWEEN :dataInicial AND :dataFinal',
      'C.TIPO_CANDIDATURA IN (2, 3)',
      'C.STATUS_ = 1',
      'GC.STATUS_ = 1',
    ];

    if (degreeId) {
      conditions.push('C.TIPO_CANDIDATURA = :degreeId');
      params.degreeId = degreeId;
    }

    if (docente !== 0) {
      conditions.push("JSON_VALUE(AA.REF_AULA, '$.pkDocente' RETURNING NUMBER NULL ON ERROR) = :docente");
      params.docente = docente;
    }

    if (anoLectivo !== 0) {
      conditions.push('H.FK_ANO_LECTIVO = :anoLectivo');
      params.anoLectivo = anoLectivo;
    }

    if (semestre !== 0) {
      conditions.push('H.FK_SEMESTRE = :semestre');
      params.semestre = semestre;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const fromClause = `
      FROM FK2_MSA_TB_AGENDAMENTO_AULA AA
      INNER JOIN FK2_MGH_TB_AULA AL
        ON JSON_VALUE(AA.REF_AULA, '$.pkAula' RETURNING NUMBER NULL ON ERROR) = AL.PK_AULA
      INNER JOIN FK2_MGH_TB_HORARIO H
        ON AL.FK_HORARIO = H.PK_HORARIO
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON AA.FK_GRADE_CURRICULAR = GC.CODIGO
      INNER JOIN FK2_TB_CURSOS C
        ON GC.CODIGO_CURSO = C.CODIGO
      LEFT JOIN FK2_TB_DISCIPLINAS D
        ON GC.CODIGO_DISCIPLINA = D.CODIGO
      LEFT JOIN FK2_MSA_TB_SUMARIO S
        ON S.FK_AGENDAMENTO_AULA = AA.PK_AGENDAMENTO_AULA
       AND S.ACTIVE_STATE = 1
      LEFT JOIN FK2_MGH_TB_ESTADO_HORARIO_WF EW
        ON H.FK_ESTADO_HORARIO_WF = EW.PK_ESTADO_HORARIO_WF
      ${whereClause}
    `;

    const groupedSql = `
      SELECT
        MIN(AA.PK_AGENDAMENTO_AULA) AS CODIGO_AGENDAMENTO,
        JSON_VALUE(AL.REF_DOCENTE, '$.nome') AS DOCENTE,
        DBMS_LOB.SUBSTR(D.DESIGNACAO, 4000, 1) AS UNIDADE_CURRICULAR,
        H.DESIGNACAO AS HORARIO,
        MIN(C.DESIGNACAO) AS CURSO,
        SUM(CASE WHEN S.PK_TB_SUMARIO IS NULL THEN 1 ELSE 0 END) AS SUMARIOS_PENDENTES,
        SUM(CASE WHEN S.PK_TB_SUMARIO IS NOT NULL THEN 1 ELSE 0 END) AS SUMARIOS_LANCADOS,
        COUNT(*) AS TOTAL_SUMARIOS,
        SUM(CASE WHEN AA.FK_ESTADO_AGENDAMENTO = 1 THEN 1 ELSE 0 END) AS ASSID_PENDENTES,
        SUM(CASE WHEN AA.FK_ESTADO_AGENDAMENTO = 3 THEN 1 ELSE 0 END) AS ASSID_PRESENCA,
        SUM(CASE WHEN AA.FK_ESTADO_AGENDAMENTO = 2 THEN 1 ELSE 0 END) AS ASSID_FALTA,
        COUNT(*) AS TOTAL_ASSID,
        SUM(
          CASE
            WHEN AA.FK_ESTADO_AGENDAMENTO = 3
             AND S.PK_TB_SUMARIO IS NOT NULL
            THEN 1
            ELSE 0
          END
        ) AS SUMARIO_COM_ASSID
      ${fromClause}
      GROUP BY
        JSON_VALUE(AL.REF_DOCENTE, '$.nome'),
        DBMS_LOB.SUBSTR(D.DESIGNACAO, 4000, 1),
        H.DESIGNACAO,
        H.PK_HORARIO
    `;

    const [rows, countRows] = await Promise.all([
      this.dataSource.query<DatabaseRow[]>(
        `
        SELECT *
        FROM (${groupedSql})
        ORDER BY DOCENTE, UNIDADE_CURRICULAR, HORARIO
        OFFSET :rowOffset ROWS FETCH NEXT :rowLimit ROWS ONLY
        `,
        {
          ...params,
          rowOffset: offset,
          rowLimit: limit,
        } as any,
      ),
      this.dataSource.query<DatabaseRow[]>(
        `SELECT COUNT(*) AS TOTAL FROM (${groupedSql})`,
        params as any,
      ),
    ]);

    const total = Number(countRows[0]?.TOTAL ?? 0);

    return {
      data: rows.map((row) => ({
        codigo_agendamento: row.CODIGO_AGENDAMENTO,
        docente: row.DOCENTE,
        unidadeCurricular: row.UNIDADE_CURRICULAR,
        horario: row.HORARIO,
        curso: row.CURSO,
        controleSumarios: {
          pendentes: Number(row.SUMARIOS_PENDENTES),
          lancados: Number(row.SUMARIOS_LANCADOS),
          total: Number(row.TOTAL_SUMARIOS),
        },
        controleAssiduidade: {
          pendentes: Number(row.ASSID_PENDENTES),
          presenca: Number(row.ASSID_PRESENCA),
          falta: Number(row.ASSID_FALTA),
          total: Number(row.TOTAL_ASSID),
        },
        sumarioComAssiduidade: Number(row.SUMARIO_COM_ASSID),
      })),
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 1,
    };
  }

  async create(body: CreateSumarioDto) {
    const { descricao, fk_agendamento_aula, fk_estado_sumario } = body;
    const minLength = await this.getParametro('tms');

    if (descricao && descricao.length < minLength) {
      throw new BadRequestException(
        `O Sumário deve ter no mínimo ${minLength} caracteres.`,
      );
    }

    await this.ensureScheduledClassIsPostGraduation(fk_agendamento_aula);

    const existingRows = await this.dataSource.query<DatabaseRow[]>(
      `
      SELECT COUNT(*) AS TOTAL
      FROM FK2_MSA_TB_SUMARIO
      WHERE FK_AGENDAMENTO_AULA = :scheduledClassId
        AND ACTIVE_STATE = 1
      `,
      { scheduledClassId: fk_agendamento_aula } as any,
    );

    if (Number(existingRows[0]?.TOTAL ?? 0) > 0) {
      throw new ConflictException(
        'Já existe um sumário ativo para este agendamento de aula.',
      );
    }

    await this.dataSource.query(
      `
      INSERT INTO FK2_MSA_TB_SUMARIO (
        DESCRICAO,
        FK_AGENDAMENTO_AULA,
        FK_ESTADO_SUMARIO,
        ACTIVE_STATE,
        CREATED_AT,
        UPDATED_AT
      )
      VALUES (
        :descricao,
        :scheduledClassId,
        :summaryStatusId,
        1,
        SYSDATE,
        SYSDATE
      )
      `,
      {
        descricao,
        scheduledClassId: fk_agendamento_aula,
        summaryStatusId: fk_estado_sumario,
      } as any,
    );

    return { success: true, message: 'Sumário criado com sucesso' };
  }

  async update(body: UpdateSumarioDto, summaryId: number) {
    await this.ensureSummaryIsPostGraduation(summaryId);

    const minLength = await this.getParametro('tms');
    if (body.descricao && body.descricao.length < minLength) {
      throw new BadRequestException(
        `O Sumário deve ter no mínimo ${minLength} caracteres.`,
      );
    }

    const fields: string[] = [];
    const params: Record<string, unknown> = { summaryId };

    if (body.descricao !== undefined) {
      fields.push('DESCRICAO = :descricao');
      params.descricao = body.descricao;
    }

    if (body.fk_agendamento_aula !== undefined) {
      await this.ensureScheduledClassIsPostGraduation(body.fk_agendamento_aula);
      fields.push('FK_AGENDAMENTO_AULA = :scheduledClassId');
      params.scheduledClassId = body.fk_agendamento_aula;
    }

    if (body.active_state !== undefined) {
      fields.push('ACTIVE_STATE = :activeState');
      params.activeState = body.active_state;
    }

    if (body.justificacao_director !== undefined) {
      fields.push('JUSTIFICACAO_DIRECTOR = :directorJustification');
      params.directorJustification = body.justificacao_director;
    }

    fields.push('UPDATED_AT = SYSDATE');

    if (fields.length === 1) {
      throw new ConflictException('Nenhum campo enviado para atualização');
    }

    await this.dataSource.query(
      `
      UPDATE FK2_MSA_TB_SUMARIO
      SET ${fields.join(', ')}
      WHERE PK_TB_SUMARIO = :summaryId
      `,
      params as any,
    );

    return { success: true, message: 'Sumário atualizado com sucesso' };
  }

  async validate(statusId: number, summaryId: number) {
    if (statusId === undefined) {
      throw new ConflictException('Estado do sumário é obrigatório');
    }

    const summary = await this.ensureSummaryIsPostGraduation(summaryId);
    const scheduledClassId = Number(summary.FK_AGENDAMENTO_AULA);

    const scheduledClassRows = await this.dataSource.query<DatabaseRow[]>(
      `
      SELECT FK_ESTADO_AGENDAMENTO
      FROM FK2_MSA_TB_AGENDAMENTO_AULA
      WHERE PK_AGENDAMENTO_AULA = :scheduledClassId
      `,
      { scheduledClassId } as any,
    );

    if (!scheduledClassRows.length) {
      throw new NotFoundException('Aula relacionada ao sumário não encontrada');
    }

    let canValidate = Number(scheduledClassRows[0].FK_ESTADO_AGENDAMENTO) === 3;

    if (!canValidate) {
      canValidate = await this.getParametro('pvssms');
    }

    if (!canValidate) {
      throw new ConflictException(
        'Não é possível validar o sumário porque a aula ainda não foi validada',
      );
    }

    await this.dataSource.query(
      `
      UPDATE FK2_MSA_TB_SUMARIO
      SET FK_ESTADO_SUMARIO = :statusId,
          UPDATED_AT = SYSDATE
      WHERE PK_TB_SUMARIO = :summaryId
      `,
      { statusId, summaryId } as any,
    );

    return { success: true, message: 'Sumário atualizado com sucesso' };
  }

  private async ensureScheduledClassIsPostGraduation(scheduledClassId: number) {
    const rows = await this.dataSource.query<DatabaseRow[]>(
      `
      SELECT AA.PK_AGENDAMENTO_AULA
      FROM FK2_MSA_TB_AGENDAMENTO_AULA AA
      INNER JOIN FK2_MGH_TB_AULA AL
        ON JSON_VALUE(AA.REF_AULA, '$.pkAula' RETURNING NUMBER NULL ON ERROR) = AL.PK_AULA
      INNER JOIN FK2_MGH_TB_HORARIO H
        ON AL.FK_HORARIO = H.PK_HORARIO
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON AA.FK_GRADE_CURRICULAR = GC.CODIGO
      INNER JOIN FK2_TB_CURSOS C
        ON GC.CODIGO_CURSO = C.CODIGO
      WHERE AA.PK_AGENDAMENTO_AULA = :scheduledClassId
        AND AA.ACTIVE_STATE = 1
        AND C.TIPO_CANDIDATURA IN (2, 3)
        AND C.STATUS_ = 1
        AND GC.STATUS_ = 1
      FETCH FIRST 1 ROWS ONLY
      `,
      { scheduledClassId } as any,
    );

    if (!rows.length) {
      throw new NotFoundException(
        'Agendamento de aula de Pós-Graduação não encontrado',
      );
    }
  }

  private async ensureSummaryIsPostGraduation(summaryId: number) {
    const rows = await this.dataSource.query<DatabaseRow[]>(
      `
      SELECT
        S.PK_TB_SUMARIO,
        S.FK_AGENDAMENTO_AULA
      FROM FK2_MSA_TB_SUMARIO S
      INNER JOIN FK2_MSA_TB_AGENDAMENTO_AULA AA
        ON S.FK_AGENDAMENTO_AULA = AA.PK_AGENDAMENTO_AULA
      INNER JOIN FK2_MGH_TB_AULA AL
        ON JSON_VALUE(AA.REF_AULA, '$.pkAula' RETURNING NUMBER NULL ON ERROR) = AL.PK_AULA
      INNER JOIN FK2_MGH_TB_HORARIO H
        ON AL.FK_HORARIO = H.PK_HORARIO
      INNER JOIN FK2_TB_GRADE_CURRICULAR GC
        ON AA.FK_GRADE_CURRICULAR = GC.CODIGO
      INNER JOIN FK2_TB_CURSOS C
        ON GC.CODIGO_CURSO = C.CODIGO
      WHERE S.PK_TB_SUMARIO = :summaryId
        AND S.ACTIVE_STATE = 1
        AND AA.ACTIVE_STATE = 1
        AND C.TIPO_CANDIDATURA IN (2, 3)
        AND C.STATUS_ = 1
        AND GC.STATUS_ = 1
      FETCH FIRST 1 ROWS ONLY
      `,
      { summaryId } as any,
    );

    if (!rows.length) {
      throw new NotFoundException('Sumário de Pós-Graduação não encontrado');
    }

    return rows[0];
  }

  private async getParametro(sigla: string): Promise<any> {
    const rows = await this.dataSource.query<DatabaseRow[]>(
      `
      SELECT ARGS AS VALOR
      FROM FK2_MSA_TB_PARAMETRO
      WHERE SIGLA = :sigla
      `,
      { sigla } as any,
    );

    if (!rows.length) {
      return null;
    }

    try {
      return JSON.parse(String(rows[0].VALOR)).valor;
    } catch {
      return rows[0].VALOR;
    }
  }
}
