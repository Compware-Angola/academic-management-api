import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { StudentEnrolledByAssessmentDTO } from './dto/student-enrolled-by-assessment.dto';

@Injectable()
export class StudentsEnrolledByAssessmentsService {
  constructor(private readonly dataSource: DataSource) {}
  async findAllStudentEnrolledAvaluation(
    filters: StudentEnrolledByAssessmentDTO,
  ) {
    const {
      anoLectivo,
      semestre,
      periodo,
      curso,
      unidadeCurricular,
      anoCurricular,
      tipoAvaliacao,
      horarioId,
      page = 1,
      limit = 25,
    } = filters;

    const offset = (page - 1) * limit;

    const baseWhere = `
    ia.codigo_ano_lectivo       = ${anoLectivo}
    AND ia.codigo_tipo_avaliacao = ${tipoAvaliacao}
    AND gc.Codigo_Curso         = ${curso}
    AND gc.Codigo               = ${unidadeCurricular}
    AND gc.Codigo_Classe        = ${anoCurricular}
    AND gc.Codigo_Semestre      = ${semestre}
    AND h.FK_PERIODO            = ${periodo}
    AND json_value(gca.ref_horario, '$.pk') = ${horarioId}
  `;

    /* =========================
     QUERY PRINCIPAL
  ========================== */
    const sql = `
    SELECT DISTINCT
      ia.CODIGO_MATRICULA          AS CODIGO_MATRICULA,
      dd.CODIGO                    AS CODIGO_DISCIPLINA,
      dd.DESIGNACAO                AS DISCIPLINA_DESIGNACAO,
      gc.CODIGO                    AS CODIGO_GRADE,
      ia.ESTADO                    AS ESTADO,
      ta.DESIGNACAO                AS AVALIACAO,
      ur.NAME                      AS NOME
    FROM FK2_INSCRICAO_AVALIACOES ia
      INNER JOIN fk2_tb_grade_curricular_aluno gca
        ON gca.codigo = ia.codigo_grade_aluno
      INNER JOIN fk2_tb_grade_curricular gc
        ON gc.CODIGO = gca.codigo_grade_curricular
      INNER JOIN FK2_TB_DISCIPLINAS dd
        ON dd.CODIGO = gc.CODIGO_DISCIPLINA
      INNER JOIN FK2_TB_TIPO_AVALIACAO ta
        ON ta.CODIGO = ia.CODIGO_TIPO_AVALIACAO
      INNER JOIN FK2_TB_MATRICULAS m
        ON m.CODIGO = ia.CODIGO_MATRICULA
      INNER JOIN FK2_TB_ADMISSAO ad
        ON ad.CODIGO = m.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO pr
        ON pr.CODIGO = ad.PRE_INCRICAO
      INNER JOIN FK2_USERS ur
        ON ur.ID = pr.USER_ID
       INNER JOIN FK2_MGH_TB_HORARIO h on h.PK_HORARIO = json_value(gca.ref_horario, '$.pk')
    WHERE ${baseWhere}
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    /* =========================
     QUERY DE CONTAGEM
  ========================== */
    const sqlCount = `
  SELECT COUNT(DISTINCT ia.CODIGO_MATRICULA) AS TOTAL
  FROM FK2_INSCRICAO_AVALIACOES ia
    INNER JOIN fk2_tb_grade_curricular_aluno gca
      ON gca.codigo = ia.codigo_grade_aluno
    INNER JOIN fk2_tb_grade_curricular gc
      ON gc.CODIGO = gca.codigo_grade_curricular
    INNER JOIN FK2_MGH_TB_HORARIO h
      ON h.PK_HORARIO = json_value(gca.ref_horario, '$.pk')
  WHERE ${baseWhere}
`;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql),
      this.dataSource.query(sqlCount),
    ]);

    const total = Number(countResult[0]?.TOTAL ?? 0);
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
