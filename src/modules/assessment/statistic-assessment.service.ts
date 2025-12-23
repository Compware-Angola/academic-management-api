import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { StatisticAssessmentDTO } from './dto/statistic-assessment.dto';

@Injectable()
export class StatisticAssessmentsService {
  constructor(private readonly dataSource: DataSource) {}

  async findStatisticAssessment(filters: StatisticAssessmentDTO) {
    const { anoLectivo, tipoProva, horarioId, gradeId } = filters;

    const baseWhere = `
      tgca.CODIGO_ANO_LECTIVO = ${anoLectivo}
      AND tgca.CODIGO_STATUS_GRADE_CURRICULAR NOT IN (4,5)
      AND tgca.codigo_grade_curricular = ${gradeId}
      AND JSON_VALUE(tgca.REF_HORARIO, '$.pk') = ${horarioId}
    `;

    const sql = `
      WITH DadosGrade AS (
        SELECT
          cc.DESIGNACAO AS curso,
          dd.DESIGNACAO AS disciplina
        FROM FK2_TB_GRADE_CURRICULAR gc
        INNER JOIN FK2_TB_CURSOS cc ON cc.codigo = gc.CODIGO_CURSO
        INNER JOIN FK2_TB_DISCIPLINAS dd ON dd.codigo = gc.CODIGO_DISCIPLINA
        WHERE gc.codigo = ${gradeId}
      ),
      NomeAvaliacao AS (
        SELECT DESIGNACAO AS avaliacao
        FROM FK2_MCAL_TB_TIPO_AVALIACAO
        WHERE PK_TIPO_AVALIACAO = ${tipoProva}
      ),
      NomeHorario AS (
        SELECT DESIGNACAO AS nomehorario
        FROM FK2_MGH_TB_HORARIO
        WHERE PK_HORARIO = ${horarioId}
      ),
      Inscritos AS (
        SELECT COUNT(DISTINCT codigo) AS qtdInscrito
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        WHERE ${baseWhere}
      ),
      AvaliacoesPorTipo AS (
        SELECT
          tgcaa.tipo_avaliacao,
          tgca.codigo AS aluno_codigo,
          tgcaa.nota
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        INNER JOIN fk2_tb_grade_curricular_aluno_avaliacoes tgcaa
          ON tgcaa.grade_curricular_aluno = tgca.codigo
          AND tgcaa.tipo_avaliacao IN (2, 3)
          AND tgcaa.tipo_de_prova = ${tipoProva}
        WHERE ${baseWhere}
      )
      SELECT
        dg.curso,
        dg.disciplina,
        na.avaliacao,
        nh.nomehorario,
        a.tipo_avaliacao AS tipoAvaliacao,
        i.qtdInscrito,
        COUNT(DISTINCT CASE WHEN a.nota IS NOT NULL THEN a.aluno_codigo END) AS qtdAvaliados,
        COUNT(DISTINCT CASE WHEN a.nota >= 8 THEN a.aluno_codigo END) AS qtdAprovados,
        COUNT(DISTINCT CASE WHEN a.nota IS NOT NULL AND a.nota < 8 THEN a.aluno_codigo END) AS qtdReprovados,

        ROUND(100.0 * COUNT(DISTINCT CASE WHEN a.nota IS NOT NULL THEN a.aluno_codigo END) / i.qtdInscrito, 2) AS taxaAvaliacao_sobreInscritos,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN a.nota >= 8 THEN a.aluno_codigo END) / i.qtdInscrito, 2) AS taxaAprovacao_sobreInscritos,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN a.nota IS NOT NULL AND a.nota < 8 THEN a.aluno_codigo END) / i.qtdInscrito, 2) AS taxaReprovacao_sobreInscritos,

        ROUND(100.0 * COUNT(DISTINCT CASE WHEN a.nota >= 8 THEN a.aluno_codigo END)
              / NULLIF(COUNT(DISTINCT CASE WHEN a.nota IS NOT NULL THEN a.aluno_codigo END), 0), 2) AS taxaAprovacao_sobreAvaliados,

        ROUND(100.0 * COUNT(DISTINCT CASE WHEN a.nota IS NOT NULL AND a.nota < 8 THEN a.aluno_codigo END)
              / NULLIF(COUNT(DISTINCT CASE WHEN a.nota IS NOT NULL THEN a.aluno_codigo END), 0), 2) AS taxaReprovacao_sobreAvaliados
      FROM AvaliacoesPorTipo a
      CROSS JOIN Inscritos i
      CROSS JOIN DadosGrade dg
      CROSS JOIN NomeAvaliacao na
      CROSS JOIN NomeHorario nh
      GROUP BY
        dg.curso,
        dg.disciplina,
        na.avaliacao,
        nh.nomehorario,
        a.tipo_avaliacao,
        i.qtdInscrito
      ORDER BY a.tipo_avaliacao
    `;

    const result = await this.dataSource.query(sql);

    const data = result.map((row) => toLowerCaseKeys(row));

    return { data };
  }
}
