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
      tipoAvaliacao,
      tipoHorario, // 1 = com prova | 2 = sem prova
      page = 1,
      limit = 25,
    } = filters;

    if (!anoLectivo) {
      throw new BadRequestException('anoLectivo é obrigatório');
    }

    const offset = (page - 1) * limit;
    const isComProva = tipoHorario === 1;
    const isSemProva = tipoHorario === 2;

    const baseParams: any = { anoLectivo };

    const whereConditions: string[] = ['tal.Codigo = :anoLectivo'];

    if (semestre !== undefined) {
      whereConditions.push('tgc.Codigo_Semestre = :semestre');
      baseParams.semestre = semestre;
    }

    if (periodo !== undefined) {
      whereConditions.push(
        "json_value(tt.ref_periodicidade, '$.pkPeriodo') = :periodo",
      );
      baseParams.periodo = periodo;
    }

    if (curso !== undefined) {
      whereConditions.push('tgc.Codigo_Curso = :curso');
      baseParams.curso = curso;
    }

    if (horarioId !== undefined) {
      whereConditions.push('tt.PK_HORARIO = :horarioId');
      baseParams.horarioId = horarioId;
    }
    if (unidadeCurricular !== undefined) {
      whereConditions.push('tt.FK_GRADE_CURRICULAR = :unidadeCurricular');
      baseParams.unidadeCurricular = unidadeCurricular;
    }

    if (anoCurricular !== undefined) {
      whereConditions.push('tgc.Codigo_Classe = :anoCurricular');
      baseParams.anoCurricular = anoCurricular;
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    let mainSql = '';
    let countSql = '';

    // ==================================================
    // 🔹 HORÁRIOS SEM PROVA
    // ==================================================
    if (isSemProva) {
      mainSql = `
        SELECT
          td.Designacao AS disciplina,
          tt.PK_HORARIO AS codigo_horario,
          tt.Designacao AS horario,
          tc.Designacao AS curso,
          tc2.Designacao AS classe,
          tal.Designacao AS anoLectivo,
          tf.Designacao AS faculdade,
          tp.Designacao AS periodo,
          NULL AS codigoProva,
          NULL AS tcp_data_prova,
          NULL AS tb_salas_designacao,
          NULL AS duracaoProva,
          NULL AS horaTermino,
          NULL AS vigilante,
          NULL AS usuarioDesc,
          NULL AS tcp_hora_prova,
          NULL AS vigilantes,
          NULL AS epoca
        FROM fk2_mgh_tb_horario tt
          INNER JOIN fk2_tb_grade_curricular tgc
            ON tgc.Codigo = json_value(tt.ref_grade_curricular, '$.pk')
          INNER JOIN fk2_tb_cursos tc ON tc.Codigo = tgc.Codigo_Curso
          INNER JOIN fk2_tb_disciplinas td ON td.Codigo = tgc.Codigo_Disciplina
          INNER JOIN fk2_tb_periodos tp
            ON tp.Codigo = json_value(tt.ref_periodicidade, '$.pkPeriodo')
          INNER JOIN fk2_tb_classes tc2 ON tc2.Codigo = tgc.Codigo_Classe
          INNER JOIN fk2_tb_ano_lectivo tal
            ON tal.Codigo = json_value(tt.ref_ano_lectivo, '$.pk')
          INNER JOIN fk2_tb_faculdade tf ON tf.Codigo = tc.faculdade_id
        ${whereClause}
          AND tt.fk_estado_horario_wf = 3
          AND tt.active_state = 1
          AND NOT EXISTS (
            SELECT 1
            FROM fk2_tb_calendario_prova tcp
              INNER JOIN fk2_mcal_tb_prazo pz
                ON json_value(tcp.ref_prazo, '$.pk_prazo') = pz.pk_prazo
            WHERE 1=1
            and json_value(tcp.ref_horario, '$.pk') = tt.pk_horario
            and pz.fk_tipo_avaliacao = ${tipoAvaliacao}
          )
        ORDER BY td.Designacao, tt.Designacao
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `;

      countSql = `
        SELECT COUNT(*) AS TOTAL
        FROM fk2_mgh_tb_horario tt
          INNER JOIN fk2_tb_grade_curricular tgc
            ON tgc.Codigo = json_value(tt.ref_grade_curricular, '$.pk')
          INNER JOIN fk2_tb_ano_lectivo tal
            ON tal.Codigo = json_value(tt.ref_ano_lectivo, '$.pk')
        ${whereClause}
          AND tt.fk_estado_horario_wf = 3
          AND tt.active_state = 1
          AND NOT EXISTS (
            SELECT 1
            FROM fk2_tb_calendario_prova tcp
              INNER JOIN fk2_mcal_tb_prazo pz
                ON json_value(tcp.ref_prazo, '$.pk_prazo') = pz.pk_prazo
            WHERE 1=1
            and json_value(tcp.ref_horario, '$.pk') = tt.pk_horario
            and pz.fk_tipo_avaliacao = ${tipoAvaliacao}
          )
      `;
    }

    // ==================================================
    // 🔹 HORÁRIOS COM PROVA
    // ==================================================
    if (isComProva) {
      if (tipoAvaliacao !== undefined) {
        whereConditions.push('mtta.pk_tipo_avaliacao = :tipoAvaliacao');
        baseParams.tipoAvaliacao = tipoAvaliacao;
      }

      const whereComProva = 'WHERE ' + whereConditions.join(' AND ');

      mainSql = `
        SELECT
          td.Designacao AS disciplina,
          tt.Designacao AS horario,
          tt.PK_HORARIO AS codigo_horario,
          tc.Designacao AS curso,
          tc2.Designacao AS classe,
          tal.Designacao AS anoLectivo,
          tf.Designacao AS faculdade,
          tp.Designacao AS periodo,
          tcp.Codigo AS codigoProva,
          tcp.Data_Prova AS tcp_data_prova,
          tb_salas.Designacao AS tb_salas_designacao,
          tcp.Hora_Termino AS horaTermino,
          tcp.Vigilante AS vigilante,
          tcp.DuracaoProva AS duracaoProva,
          json_value(tcp.ref_utilizador, '$.desc') AS usuarioDesc,
          tcp.Hora_Prova AS tcp_hora_prova,
          (
            SELECT JSON_ARRAYAGG(
              JSON_VALUE(v.REF_VIGILANTE, '$.desc')
            )
            FROM FK2_TB_CALENDARIO_PROVA_VIGILANTE v
            WHERE v.CALENDARIO_PROVA = tcp.Codigo
          ) AS vigilantes,
          mtta.Designacao AS epoca
        FROM fk2_tb_disciplinas td
          INNER JOIN fk2_tb_grade_curricular tgc
            ON td.Codigo = tgc.Codigo_Disciplina
          INNER JOIN fk2_mgh_tb_horario tt
            ON tgc.Codigo = json_value(tt.ref_grade_curricular, '$.pk')
          INNER JOIN fk2_tb_cursos tc ON tgc.Codigo_Curso = tc.Codigo
          INNER JOIN fk2_tb_classes tc2 ON tgc.Codigo_Classe = tc2.Codigo
          INNER JOIN fk2_tb_ano_lectivo tal
            ON json_value(tt.ref_ano_lectivo, '$.pk') = tal.Codigo
          INNER JOIN fk2_tb_periodos tp
            ON json_value(tt.ref_periodicidade, '$.pkPeriodo') = tp.Codigo
          INNER JOIN fk2_tb_calendario_prova tcp
            ON tt.pk_horario = json_value(tcp.ref_horario, '$.pk')
          INNER JOIN fk2_tb_salas tb_salas
            ON tb_salas.Codigo = tcp.codigo_sala
          INNER JOIN fk2_mcal_tb_prazo prazo
            ON json_value(tcp.ref_prazo, '$.pk_prazo') = prazo.pk_prazo
          INNER JOIN fk2_mcal_tb_tipo_avaliacao mtta
            ON mtta.pk_tipo_avaliacao = prazo.fk_tipo_avaliacao
          INNER JOIN fk2_tb_faculdade tf ON tc.faculdade_id = tf.Codigo
        ${whereComProva}
        ORDER BY td.Designacao, tt.Designacao
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `;

      countSql = `
        SELECT COUNT(DISTINCT tcp.Codigo) AS TOTAL
        FROM fk2_mgh_tb_horario tt
          INNER JOIN fk2_tb_grade_curricular tgc
            ON tgc.Codigo = json_value(tt.ref_grade_curricular, '$.pk')
          INNER JOIN fk2_tb_ano_lectivo tal
            ON json_value(tt.ref_ano_lectivo, '$.pk') = tal.Codigo
          INNER JOIN fk2_tb_calendario_prova tcp
            ON tt.pk_horario = json_value(tcp.ref_horario, '$.pk')
          INNER JOIN fk2_mcal_tb_prazo prazo
            ON json_value(tcp.ref_prazo, '$.pk_prazo') = prazo.pk_prazo
          INNER JOIN fk2_mcal_tb_tipo_avaliacao mtta
            ON mtta.pk_tipo_avaliacao = prazo.fk_tipo_avaliacao
        ${whereComProva}
      `;
    }

    const mainParams = { ...baseParams, offset, limit };
    const countParams = { ...baseParams };

    const [data, countResult] = await Promise.all([
      this.dataSource.query(mainSql, mainParams),
      this.dataSource.query(countSql, countParams),
    ]);

    const total = Number(countResult?.[0]?.TOTAL ?? 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data: await toLowerCaseKeys(data),
      total,
      page,
      limit,
      totalPages,
    };
  }
}
