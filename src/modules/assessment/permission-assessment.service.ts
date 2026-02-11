import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { PermissionAssessmentDTO } from './dto/permission-assessment.dto';
import * as oracledb from 'oracledb';
import { CreatePermissionAssessmentDTO } from './dto/create-permission-assessment.dto';
import { escapeQuotes } from '../util/escape-quotes';
import { UpdatePermissionAssessmentDTO } from './dto/update-permission-assessment.dto';
import { PromptGetPermissionLaunchDTO } from './dto/prompt-get-permission-launch.dto';

interface IcheckDateIntervalConflict {
  dataInicio: string;
  dataFim: string;
  docenteId: number;
  gradeId: number;
  tipoAvaliacao: number;
  anoLectivoId: number;
}
interface DateConflictResult {
  total: number;
  conflicts: {
    pkPermicao: number;
    dataInicio: Date;
    dataFim: Date;
  }[];
}
@Injectable()
export class PermissionAssessmentsService {
  constructor(private readonly dataSource: DataSource) {}
  async getNomeDocente(codigoDocente: number): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT json_value(CODIGO_UTILIZADOR,'$.desc') AS NOME
     FROM FK2_MGD_TB_DOCENTE
     WHERE CODIGO = :codigoDocente`,
      [codigoDocente],
    );

    if (!result || result.length === 0) {
      throw new Error(`Docente não encontrado para o código ${codigoDocente}`);
    }

    return result[0].NOME as string;
  }
  async getNomeUser(userId: number): Promise<string> {
    const result = await this.dataSource.query(
      `select NOME from FK2_MCA_TB_UTILIZADOR where PK_UTILIZADOR = :userId`,
      [userId],
    );

    if (!result || result.length === 0) {
      throw new Error(`Docente não encontrado para o código ${userId}`);
    }

    return result[0].NOME as string;
  }

  async getDescricaoAnoLectivo(codigoAnoLectivo: number): Promise<string> {
    const result = await this.dataSource.query(
      `SELECT designacao
     FROM FK2_TB_ANO_LECTIVO
     WHERE CODIGO = :codigoAnoLectivo`,
      [codigoAnoLectivo],
    );

    if (!result || result.length === 0) {
      throw new Error(
        `Ano lectivo não encontrado para o código ${codigoAnoLectivo}`,
      );
    }

    return result[0].DESIGNACAO as string;
  }
  async getStatusAnoLectivo(codigoAnoLectivo: number): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT STATUS_ AS ESTADO
     FROM FK2_TB_ANO_LECTIVO
     WHERE CODIGO = :codigoAnoLectivo`,
      [codigoAnoLectivo],
    );

    if (!result || result.length === 0) {
      throw new Error(
        `Ano lectivo não encontrado para o código ${codigoAnoLectivo}`,
      );
    }

    return result[0].ESTADO;
  }
  async checkDateIntervalConflict({
    dataFim,
    dataInicio,
    docenteId,
    gradeId,
    tipoAvaliacao,
    anoLectivoId,
  }: IcheckDateIntervalConflict): Promise<DateConflictResult> {
    const result = await this.dataSource.query(
      `
    SELECT
        ml.PK_PERMICAO,
        ml.DATA_INICIO,
        ml.DATA_FIM
    FROM FK2_MAV_PERMICAO_LANCAMENTO ml
    WHERE ml.ACTIVE_STATE = 1
      AND JSON_VALUE(ml.REF_DOCENTE, '$.pk')     = :docenteId
      AND JSON_VALUE(ml.REF_GRADE, '$.pk')       = :gradeId
      AND JSON_VALUE(ml.REF_ANO_LECTIVO,'$.pk')  = :anoLectivoId
      AND ml.TIPOAVALIAÇÃO                       = :tipoAvaliacao
      AND (
            TO_DATE(:dataInicio, 'YYYY-MM-DD') <= ml.DATA_FIM
        AND TO_DATE(:dataFim,    'YYYY-MM-DD') >= ml.DATA_INICIO
      )
    `,
      {
        docenteId,
        gradeId,
        tipoAvaliacao,
        dataInicio,
        dataFim,
        anoLectivoId,
      } as any,
    );

    return {
      total: result.length,
      conflicts: result.map((row) => ({
        pkPermicao: Number(row.PK_PERMICAO),
        dataInicio: row.DATA_INICIO,
        dataFim: row.DATA_FIM,
      })),
    };
  }
  async checkDateIntervalConflictExcludeSelf(
    params: IcheckDateIntervalConflict & { permissionId: number },
  ): Promise<DateConflictResult> {
    const result = await this.dataSource.query(
      `
      SELECT
        ml.PK_PERMICAO,
        ml.DATA_INICIO,
        ml.DATA_FIM
      FROM FK2_MAV_PERMICAO_LANCAMENTO ml
      WHERE ml.ACTIVE_STATE = 1
        AND ml.PK_PERMICAO <> :permissionId
        AND JSON_VALUE(ml.REF_DOCENTE,'$.pk')     = :docenteId
        AND JSON_VALUE(ml.REF_GRADE,'$.pk')       = :gradeId
        AND JSON_VALUE(ml.REF_ANO_LECTIVO,'$.pk') = :anoLectivoId
        AND ml.TIPOAVALIAÇÃO                      = :tipoAvaliacao
        AND (
              TO_DATE(:dataInicio,'YYYY-MM-DD') <= ml.DATA_FIM
          AND TO_DATE(:dataFim,'YYYY-MM-DD')    >= ml.DATA_INICIO
        )
      `,
      params as any,
    );

    return {
      total: result.length,
      conflicts: result.map((row) => ({
        pkPermicao: Number(row.PK_PERMICAO),
        dataInicio: row.DATA_INICIO,
        dataFim: row.DATA_FIM,
      })),
    };
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

    return result[0].DESIGNACAO as string;
  }
  
  async createPermissionAssessment(query: CreatePermissionAssessmentDTO) {
    const nomeDocente = await this.getNomeDocente(query.docenteId);
    const nomeGrade = await this.getDescricaoGradeCurricular(
      query.unidadeCurricular,
    );
    const conflict = await this.checkDateIntervalConflict({
      dataFim: query.dataFim,
      dataInicio: query.dataInicio,
      docenteId: query.docenteId,
      gradeId: query.unidadeCurricular,
      tipoAvaliacao: query.tipoAvalacaoId,
      anoLectivoId: query.anoLectivo,
    });
    const userNome = await this.getNomeUser(query.userId);
    const anoLectivo = await this.getDescricaoAnoLectivo(query.anoLectivo);
    const anoLectivoStatus = await this.getStatusAnoLectivo(query.anoLectivo);
    const jsonUser = `{"pk": ${query.userId}, "desc": "${escapeQuotes(userNome)}", "corLetra": "black", "disponivel": true}`;
    const jsonDocente = `{"pk": ${query.docenteId}, "desc": "${escapeQuotes(nomeDocente)}", "corLetra": "black", "disponivel": false}`;
    const jsonAnoLectivo = `{"pk": ${query.anoLectivo}, "desc": "${escapeQuotes(anoLectivo)}", "corLetra": "black", "disponivel": false}`;
    const jsonGrade = `{"pk": ${query.unidadeCurricular || 0}, "desc": "${escapeQuotes(nomeGrade)}", "corLetra": "black", "disponivel": false}`;
    const agora = new Date();
    const dataInicio = new Date(query.dataInicio);
    const dataFim = new Date(query.dataFim);

    const interval =
      agora.getTime() >= dataInicio.getTime() &&
      agora.getTime() <= dataFim.getTime();
    if (anoLectivoStatus != 1) {
      throw new BadRequestException(
        `Não podes criar uma permissão em um ano lectivo não activo`,
      );
    }
    if (!interval) {
      throw new BadRequestException(
        `Não podes criar uma permissão com este intervalo de data vencida: ${query.dataInicio} - ${query.dataFim}`,
      );
    }
    if (conflict.total > 0) {
      throw new BadRequestException({
        message:
          'Não podes criar uma permissão: o intervalo de datas entra em conflito com permissões existentes.',
        totalConflicts: conflict.total,
        conflicts: conflict.conflicts,
      });
    }

    // Inserção na tabela FK2_MAV_PERMICAO_LANCAMENTO
    const result = await this.dataSource.query(
      `
      INSERT INTO FK2_MAV_PERMICAO_LANCAMENTO (
        REF_DOCENTE,
        REF_ANO_LECTIVO,
        REF_GRADE,
        REF_UTILIZADOR,
        DATA_INICIO,
        DATA_FIM,
        ACTIVE_STATE,
        TIPOAVALIAÇÃO,
        CREATED_AT,
        UPDATED_AT
      ) VALUES (
        :refDocente,
        :refAnoLectivo,
        :refGrade,
        :refUser,
        TO_DATE(:dataInicio, 'YYYY-MM-DD'),
        TO_DATE(:dataFim, 'YYYY-MM-DD'),
        1,
        :tipoAvaliacao,
        SYSDATE,
        SYSDATE
      ) RETURNING PK_PERMICAO INTO :outId
      `,
      {
        refDocente: jsonDocente,
        refAnoLectivo: jsonAnoLectivo,
        refGrade: jsonGrade,
        refUser: jsonUser,
        dataInicio: query.dataInicio,
        dataFim: query.dataFim,
        tipoAvaliacao: query.tipoAvalacaoId,
        outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      } as any,
    );

    // Pegar o ID gerado
    const permissionId = result.outId[0];

    return {
      message: 'Permissão de Avaliação criada com sucesso',
      permissionId,
    };
  }

  async promptGetPermissionLaunch({
    anoLectivo,
    grade,
    tipoAvaliacao,
    utilizadorId,
  }: PromptGetPermissionLaunchDTO) {
    const sql = `
      SELECT
        json_value(p.REF_DOCENTE,'$.desc')            as docente,
        json_value(p.REF_ANO_LECTIVO, '$.desc')       as anoLectivo,
        json_value(p.REF_GRADE, '$.desc')             as grade,
        p.DATA_INICIO                                 as dataInicial,
        p.DATA_FIM                                    as dataFim,
        p.ACTIVE_STATE                                as active_state,
        p.TIPOAVALIAÇÃO                               as tipoAvaliacao
      FROM FK2_MAV_PERMICAO_LANCAMENTO p
      inner join FK2_MGD_TB_DOCENTE doc on doc.codigo = json_value(p.REF_DOCENTE, '$.pk')
      inner join FK2_MCA_TB_UTILIZADOR ut on ut.PK_UTILIZADOR   = json_value(doc.CODIGO_UTILIZADOR,'$.pk')
      WHERE ut.PK_UTILIZADOR = :utilizadorId
      AND json_value(p.REF_ANO_LECTIVO, '$.pk') = :anoLectivo
      AND json_value(p.REF_GRADE, '$.pk') = :grade
      AND p.TIPOAVALIAÇÃO = :tipoAvaliacao
      AND p.ACTIVE_STATE = 1
      AND TRUNC(SYSDATE) BETWEEN TRUNC(p.DATA_INICIO) AND TRUNC(p.DATA_FIM)
      FETCH FIRST 1 ROW ONLY
    `;

    const result = await this.dataSource.query(sql, {
      utilizadorId,
      anoLectivo,
      grade,
      tipoAvaliacao,
    } as any);
    return {
      data: result,
    };
  }
  async findPermissionLaunch(
    filters: PermissionAssessmentDTO,
    { anoLectivo, page = 1, limit = 25 } = filters,
  ) {
    const offset = (page - 1) * limit;

    // -------------------- WHERE BASE --------------------
    const baseWhere = `
    json_value(ml.REF_ANO_LECTIVO,'$.pk') = ${anoLectivo}
    ---AND ml.ACTIVE_STATE = 1
  `;

    // -------------------- QUERY PRINCIPAL --------------------
    const sql = `
    SELECT DISTINCT
        ml.PK_PERMICAO                               AS CODIGO_PERMISSAO,
        ml.ACTIVE_STATE                              AS ESTADO,
        al.DESIGNACAO                                AS ANO_LECTIVO,
        cs.DESIGNACAO                                AS CURSO,
        av.DESIGNACAO                                AS AVALIACAO,
        ut.NOME                                      AS UTILIZADOR,
        d.DESIGNACAO                                 AS DISCIPLINA,
        ml.DATA_INICIO                               AS DATA_INICIO,
        json_value(dc_doc.CODIGO_UTILIZADOR,'$.desc') AS NOME_DOCENTE,
        ml.DATA_FIM                                  AS DATA_FIM,
        ml.CREATED_AT                                AS CREATED_AT
    FROM FK2_MAV_PERMICAO_LANCAMENTO ml
        INNER JOIN FK2_MGD_TB_DOCENTE dc_doc
                ON dc_doc.CODIGO = json_value(ml.REF_DOCENTE,'$.pk')
        INNER JOIN FK2_TB_ANO_LECTIVO al
                ON al.CODIGO = json_value(ml.REF_ANO_LECTIVO,'$.pk')
        INNER JOIN FK2_TB_GRADE_CURRICULAR gc
                ON gc.CODIGO = json_value(ml.REF_GRADE,'$.pk')
        INNER JOIN FK2_TB_DISCIPLINAS d
                ON d.CODIGO = gc.CODIGO_DISCIPLINA
        INNER JOIN FK2_TB_CURSOS cs on cs.codigo = gc.CODIGO_CURSO
        INNER JOIN FK2_TB_TIPO_AVALIACAO av
                ON av.codigo = ml.TIPOAVALIAÇÃO
        INNER JOIN FK2_MCA_TB_UTILIZADOR ut
                ON ut.PK_UTILIZADOR = json_value(ml.REF_UTILIZADOR,'$.pk')
    WHERE ${baseWhere}
    ORDER BY ml.PK_PERMICAO ASC
    OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY
  `;

    // -------------------- QUERY DE CONTAGEM --------------------
    const sqlCount = `
    SELECT COUNT(*) AS TOTAL
    FROM (
        SELECT DISTINCT ml.PK_PERMICAO
        FROM FK2_MAV_PERMICAO_LANCAMENTO ml
            INNER JOIN FK2_TB_ANO_LECTIVO al
                    ON al.CODIGO = json_value(ml.REF_ANO_LECTIVO,'$.pk')
        WHERE ${baseWhere}
    )
  `;

    // -------------------- EXECUÇÃO --------------------
    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql),
      this.dataSource.query(sqlCount),
    ]);

    const total = Number(countResult[0].TOTAL);
    const totalPages = Math.ceil(total / filters.limit!);

    return {
      data: await toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async updatePermissionAssessment(
    permissionId: number,
    query: UpdatePermissionAssessmentDTO,
  ) {
    const sets: string[] = [];
    const params: any = { permissionId: permissionId };

    if (query.dataInicio) {
      sets.push(`DATA_INICIO = TO_DATE(:dataInicio,'YYYY-MM-DD')`);
      params.dataInicio = query.dataInicio;
    }

    if (query.dataFim) {
      sets.push(`DATA_FIM = TO_DATE(:dataFim,'YYYY-MM-DD')`);
      params.dataFim = query.dataFim;
    }

    if (query.ativeState !== undefined) {
      sets.push(`ACTIVE_STATE = :activeState`);
      params.activeState = query.ativeState;
    }

    if (sets.length === 0) {
      throw new BadRequestException(
        'Nenhum parâmetro foi enviado para actualização',
      );
    }

    if (query.dataInicio && query.dataFim) {
      const agora = new Date();
      const inicio = new Date(query.dataInicio);
      const fim = new Date(query.dataFim);

      if (agora < inicio || agora > fim) {
        throw new BadRequestException(
          `Intervalo de datas inválido: ${query.dataInicio} - ${query.dataFim}`,
        );
      }
    }

    const result = await this.dataSource.query(
      `
    UPDATE FK2_MAV_PERMICAO_LANCAMENTO
    SET ${sets.join(', ')},
        UPDATED_AT = SYSDATE
    WHERE PK_PERMICAO = :permissionId
    `,
      params,
    );

    if (result.rowsAffected === 0) {
      throw new BadRequestException('Permissão não encontrada');
    }

    return {
      message: 'Permissão actualizada com sucesso',
      permissionId: permissionId,
    };
  }
}
