import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { MarkingAssessmentDTO } from './dto/marking-assessment.dto';

@Injectable()
export class MarkingAssessmentService {
  constructor(private readonly dataSource: DataSource) {}

  async findMarkingAssementService(filters: MarkingAssessmentDTO) {
    const {
      unidadeCurricular,
      anoLectivo,
      semestre,
      periodo,
      curso,
      horarioId,
      anoCurricular,
      tipoHorario,
      prazoId,
      page = 1,
      limit = 25,
    } = filters;

    if (!anoLectivo) {
      throw new BadRequestException('anoLectivo é obrigatório');
    }
    // ==================================================
    // 🔹 HORÁRIOS COM PROVA
    // ==================================================
    const offset = (page - 1) * limit;
    const isComProva = tipoHorario === 1;
    const isSemProva = tipoHorario === 2;

    if (isComProva) {
      const baseWhere = `
        1=1
        AND (:semestre                IS NULL OR tgc.Codigo_Semestre = :semestre)
        AND (:curso                   IS NULL OR tc.Codigo = :curso)
        AND (:anoCurricular           IS NULL OR tc2.Codigo = :anoCurricular)
        AND (:anoLectivo              IS NULL OR tal.Codigo = :anoLectivo)
        --AND (:tipoAvaliacao         IS NULL OR mtta.pk_tipo_avaliacao = :tipoAvaliacao)
        AND (:prazoId                 IS NULL OR  prazo.pk_prazo = :prazoId)
        AND (:periodo                 IS NULL OR tt.FK_PERIODO = :periodo)
        AND (:horarioId               IS NULL OR tt.PK_HORARIO = :horarioId)
        AND (:unidadeCurricular       IS NULL OR tt.FK_GRADE_CURRICULAR = :unidadeCurricular)
      `;
      const sqlHorarioComProvas = `
        SELECT
            td.Designacao   AS disciplina,
            tt.PK_HORARIO   AS codigo_horario,
            tt.Designacao   AS horario,
            tc.Designacao   AS curso,
            tc2.Designacao  AS classe,
            tal.Designacao  AS anoLectivo,
            tf.designacao   AS faculdade,
            tp.Designacao   AS periodo,
            tcp.codigo      AS codigoProva,
            tcp.data_prova  AS tcp_data_prova,
            to_char(tcp.HORA_TERMINO,'hh24:mi:ss') as horatermino,
            ts.Designacao   AS tb_salas_Designacao,
            tt.PK_HORARIO AS codigo_horario,
            to_char(tcp.hora_prova,'hh24:mi:ss')  AS tcp_hora_prova,
            to_char(tcp.DuracaoProva,'hh24:mi:ss') AS duracaoProva,
            json_value(tcp.ref_utilizador, '$.desc') AS usuarioDesc,
            (
              SELECT JSON_ARRAYAGG(
                JSON_VALUE(v.REF_VIGILANTE, '$.desc')
              )
              FROM FK2_TB_CALENDARIO_PROVA_VIGILANTE v
              WHERE v.CALENDARIO_PROVA = tcp.Codigo
            ) AS vigilantes,
            mtta.designacao AS Epoca
        FROM fk2_tb_disciplinas td
        INNER JOIN fk2_tb_grade_curricular tgc
            ON td.Codigo = tgc.Codigo_Disciplina
        INNER JOIN fk2_mgh_tb_horario tt
            ON tgc.Codigo = JSON_VALUE(tt.ref_grade_curricular, '$.pk')
        INNER JOIN fk2_tb_cursos tc
            ON tgc.Codigo_Curso = tc.Codigo
        INNER JOIN fk2_tb_classes tc2
            ON tgc.Codigo_Classe = tc2.Codigo
        INNER JOIN fk2_tb_ano_lectivo tal
            ON JSON_VALUE(tt.ref_ano_lectivo, '$.pk') = tal.Codigo
        INNER JOIN fk2_tb_periodos tp
            ON JSON_VALUE(tt.ref_periodicidade, '$.pkPeriodo') = tp.Codigo
        INNER JOIN fk2_tb_calendario_prova tcp
            ON tt.pk_horario = JSON_VALUE(tcp.ref_horario, '$.pk')
        LEFT JOIN fk2_tb_salas ts
            ON ts.Codigo = tcp.codigo_sala
        INNER JOIN fk2_mcal_tb_prazo prazo
            ON JSON_VALUE(tcp.ref_prazo, '$.pk_prazo') = prazo.pk_prazo
        INNER JOIN fk2_tb_faculdade tf
            ON tc.faculdade_id = tf.codigo
        INNER JOIN fk2_mcal_tb_tipo_avaliacao mtta
            ON mtta.pk_tipo_avaliacao = prazo.fk_tipo_avaliacao
        WHERE ${baseWhere}
        ORDER BY
          td.Designacao ASC
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `;
      const sqlCountComProva = `
      SELECT COUNT(*) AS TOTAL
      FROM fk2_tb_disciplinas td
      INNER JOIN fk2_tb_grade_curricular tgc
          ON td.Codigo = tgc.Codigo_Disciplina
      INNER JOIN fk2_mgh_tb_horario tt
          ON tgc.Codigo = JSON_VALUE(tt.ref_grade_curricular, '$.pk')
      INNER JOIN fk2_tb_cursos tc
          ON tgc.Codigo_Curso = tc.Codigo
      INNER JOIN fk2_tb_classes tc2
          ON tgc.Codigo_Classe = tc2.Codigo
      INNER JOIN fk2_tb_ano_lectivo tal
          ON JSON_VALUE(tt.ref_ano_lectivo, '$.pk') = tal.Codigo
      INNER JOIN fk2_tb_periodos tp
          ON JSON_VALUE(tt.ref_periodicidade, '$.pkPeriodo') = tp.Codigo
      INNER JOIN fk2_tb_calendario_prova tcp
          ON tt.pk_horario = JSON_VALUE(tcp.ref_horario, '$.pk')
      INNER JOIN fk2_mcal_tb_prazo prazo
          ON JSON_VALUE(tcp.ref_prazo, '$.pk_prazo') = prazo.pk_prazo
      INNER JOIN fk2_mcal_tb_tipo_avaliacao mtta
          ON mtta.pk_tipo_avaliacao = prazo.fk_tipo_avaliacao
      WHERE ${baseWhere}`;
      // -------------------- EXECUÇÃO --------------------
      const params = {
        semestre: semestre ?? null,
        curso: curso ?? null,
        anoCurricular: anoCurricular ?? null,
        anoLectivo: anoLectivo ?? null,
        prazoId: prazoId ?? null,
        periodo: periodo ?? null,
        horarioId: horarioId ?? null,
        unidadeCurricular: unidadeCurricular ?? null,
      };

      const [result, countResult] = await Promise.all([
        this.dataSource.query(sqlHorarioComProvas, params as any),
        this.dataSource.query(sqlCountComProva, params as any),
      ]);
      const total = Number(countResult?.[0]?.TOTAL ?? 0);
      const totalPages = Math.ceil(total / limit);
      return {
        data: await toLowerCaseKeys(result),
        total,
        page,
        limit,
        totalPages,
      };
    } else if (isSemProva) {
      const sqlHorariosSemProva = `
        SELECT
          td.Designacao        AS disciplina,
          th.Designacao        AS horario,
          gc.Codigo_Semestre   AS semestre,
          tc.Designacao        AS curso,
          th.PK_HORARIO        AS codigo_horario,
          gc.Codigo_Classe     AS classe,
          th.fk_periodo        AS periodo,
          NULL                 As faculdade,
          NULL                 AS codigoProva,
          NULL                 AS tcp_data_prova,
          NULL                 AS tb_salas_designacao,
          NULL                 AS duracaoProva,
          NULL                 AS horatermino,
          NULL                 AS vigilante,
          NULL                 AS usuarioDesc,
          NULL                 AS tcp_hora_prova,
          NULL                 AS vigilantes,
          NULL                 AS epoca
        FROM fk2_tb_grade_curricular gc
        INNER JOIN fk2_tb_disciplinas td
            ON td.Codigo = gc.Codigo_Disciplina
        INNER JOIN fk2_tb_cursos tc
            ON tc.Codigo = gc.Codigo_Curso
        INNER JOIN fk2_mgh_tb_horario th
            ON gc.Codigo = JSON_VALUE(th.ref_grade_curricular, '$.pk')
        WHERE 1=1
          AND JSON_VALUE(th.ref_ano_lectivo, '$.pk') = :anoLectivo
          AND (:curso                   is null or  gc.Codigo_Curso = :curso )
          AND (:semestre                is null or  gc.Codigo_Semestre = :semestre)
          AND (:anoCurricular           is null or  gc.Codigo_Classe   = :anoCurricular)
          AND (:horarioId               is null or  th.PK_HORARIO = :horarioId)
          AND (:unidadeCurricular       is null or  th.FK_GRADE_CURRICULAR = :unidadeCurricular)
          AND (:periodo                 IS NULL OR  th.FK_PERIODO = :periodo)
          AND th.active_state = 1
          AND th.fk_estado_horario_wf = 3
          AND th.pk_horario NOT IN (
                SELECT JSON_VALUE(t.ref_horario, '$.pk')
                FROM fk2_tb_calendario_prova t
                INNER JOIN fk2_mcal_tb_prazo prazo
                    ON JSON_VALUE(t.ref_prazo, '$.pk_prazo') = prazo.pk_prazo
                WHERE 1=1
                and prazo.pk_prazo = :prazoId
          )
        order by th.Designacao asc
        OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
      `;

      const sqlCountHorariosSemProva = `
      SELECT COUNT(*) AS TOTAL
      FROM fk2_tb_grade_curricular gc
      INNER JOIN fk2_tb_disciplinas td
          ON td.Codigo = gc.Codigo_Disciplina
      INNER JOIN fk2_tb_cursos tc
          ON tc.Codigo = gc.Codigo_Curso
      INNER JOIN fk2_mgh_tb_horario th
          ON gc.Codigo = JSON_VALUE(th.ref_grade_curricular, '$.pk')
      WHERE 1=1
        AND JSON_VALUE(th.ref_ano_lectivo, '$.pk') = :anoLectivo
        AND (:curso             IS NULL OR gc.Codigo_Curso   = :curso)
        AND (:semestre          IS NULL OR gc.Codigo_Semestre = :semestre)
        AND (:anoCurricular     IS NULL OR gc.Codigo_Classe   = :anoCurricular)
        AND (:horarioId         IS NULL OR th.PK_HORARIO      = :horarioId)
        AND (:unidadeCurricular IS NULL OR th.FK_GRADE_CURRICULAR = :unidadeCurricular)
        AND (:periodo           IS NULL OR th.FK_PERIODO = :periodo)
        AND th.active_state = 1
        AND th.fk_estado_horario_wf = 3
        AND th.pk_horario NOT IN (
              SELECT JSON_VALUE(t.ref_horario, '$.pk')
              FROM fk2_tb_calendario_prova t
              INNER JOIN fk2_mcal_tb_prazo prazo
                  ON JSON_VALUE(t.ref_prazo, '$.pk_prazo') = prazo.pk_prazo
              WHERE prazo.pk_prazo = :prazoId
        )
      `;
      // -------------------- EXECUÇÃO --------------------
      const params = {
        semestre: semestre ?? null,
        curso: curso ?? null,
        anoCurricular: anoCurricular ?? null,
        anoLectivo: anoLectivo ?? null,
        prazoId: prazoId ?? null,
        periodo: periodo ?? null,
        horarioId: horarioId ?? null,
        unidadeCurricular: unidadeCurricular ?? null,
      };
      const [result, countResult] = await Promise.all([
        this.dataSource.query(sqlHorariosSemProva, params as any),
        this.dataSource.query(sqlCountHorariosSemProva, params as any),
      ]);
      const total = Number(countResult?.[0]?.TOTAL ?? 0);
      const totalPages = Math.ceil(total / limit);
      return {
        data: await toLowerCaseKeys(result),
        total,
        page,
        limit,
        totalPages,
      };
    }

    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }
  async findById(codigo: number) {
    const sqlCalendario = `
    SELECT
        -- Horário
        hr.PK_HORARIO       AS codigo_horario,
        hr.DESIGNACAO       AS horario,

        -- Ano Lectivo
        hr.FK_ANO_LECTIVO   AS codigo_ano_lectivo,
        hr.FK_SEMESTRE      AS codigo_semestre,
        hr.FK_PERIODO       AS codigo_periodo,

        -- Grade Curricular
        g.CODIGO_CURSO      AS codigo_curso,
        g.CODIGO_CLASSE     AS codigo_classe,
        g.CODIGO            AS codigo_grade,

        -- Prova
        cp.CODIGO           AS codigo_prova,
        cp.CODIGO_TIPO_PROVA AS codigo_tipo_prova,
        cp.CODIGO_SALA      AS codigo_sala,
        to_char(cp.HORA_TERMINO,'hh24:mi:ss')     AS hora_termino,
        to_char(cp.HORA_PROVA ,'hh24:mi:ss')      AS hora_prova,
        TO_CHAR(cp.DATA_PROVA, 'YYYY-MM-DD')       AS data_prova,
        cp.CODIGO_MODALIDADE AS codigo_modalidade,

        --Tipo de Prova
        json_value(cp.REF_PRAZO,'$.pk_prazo') AS codigo_prazo,

        cp.codigo_calendario                     as tipo_candidatura

    FROM FK2_TB_CALENDARIO_PROVA cp
    INNER JOIN FK2_MGH_TB_HORARIO hr
        ON hr.PK_HORARIO = JSON_VALUE(cp.REF_HORARIO,'$.pk')
    INNER JOIN FK2_TB_GRADE_CURRICULAR g
        ON g.CODIGO = hr.FK_GRADE_CURRICULAR
    WHERE cp.CODIGO = :codigo
  `;

    const sqlVigilantes = `
    SELECT
        vg.VIGILANTE AS codigo_utilizador,
        JSON_VALUE(vg.REF_VIGILANTE, '$.desc') AS nome_vigilante,
        doc.CODIGO AS codigo_docente
    FROM FK2_TB_CALENDARIO_PROVA_VIGILANTE vg
    INNER JOIN FK2_MGD_TB_DOCENTE doc
        ON JSON_VALUE(doc.CODIGO_UTILIZADOR, '$.pk') = vg.VIGILANTE
    WHERE vg.CALENDARIO_PROVA = :codigo
  `;

    const [calendarioResult, vigilantesResult] = await Promise.all([
      this.dataSource.query(sqlCalendario, { codigo } as any),
      this.dataSource.query(sqlVigilantes, { codigo } as any),
    ]);

    if (!calendarioResult.length) {
      return null;
    }

    const calendario = (await toLowerCaseKeys(calendarioResult))[0];

    calendario.vigilantes = await toLowerCaseKeys(vigilantesResult);

    return calendario;
  }
}
