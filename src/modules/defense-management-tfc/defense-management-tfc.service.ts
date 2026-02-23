import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { ListFinalistStudentsQueryDto, ListFinalistStudentsResponseDto } from './dto';

@Injectable()
export class DefenseManagementTfcService {
  constructor(private readonly dataSource: DataSource) {}

  async listFinalistStudents(
    query: ListFinalistStudentsQueryDto
  ): Promise<ListFinalistStudentsResponseDto> {
    const { anoLectivo, tipoCandidatura, curso, page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    // CTEs com placeholders únicos para evitar confusão do driver Oracle
    const commonCTEs = `
      WITH total_cadeiras AS (
          SELECT tpcc.codigo_curso, COUNT(tpcg.codigo_grade_curricular) AS total
          FROM FK2_TB_PLANO_CURRICULAR_GRADE tpcg
          INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc ON tpcg.codigo_plano_curricular_curso = tpcc.codigo
          WHERE tpcc.codigo_ano_lectivo = :1
          GROUP BY tpcc.codigo_curso
      ),
      total_cadeiras_candidatura AS (
          SELECT tp2.Curso_Candidatura AS codigo_curso, COUNT(tpcg.codigo_grade_curricular) AS total
          FROM FK2_TB_PREINSCRICAO tp2
          INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc ON tpcc.codigo_curso = tp2.Curso_Candidatura
          INNER JOIN FK2_TB_PLANO_CURRICULAR_GRADE tpcg ON tpcg.codigo_plano_curricular_curso = tpcc.codigo
          WHERE tpcc.codigo_ano_lectivo = :2
          GROUP BY tp2.Curso_Candidatura
      ),
      cadeiras_concluidas AS (
          SELECT tgca.codigo_matricula, COUNT(tgca.codigo_grade_curricular) AS concluidas
          FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
          INNER JOIN FK2_TB_GRADE_CURRICULAR tgc ON tgc.Codigo = tgca.codigo_grade_curricular
          WHERE tgca.Codigo_Status_Grade_Curricular = 3
            AND tgc.status_ NOT IN (0,3)
          GROUP BY tgca.codigo_matricula
      )
    `;

    const whereClause = `
      WHERE (:3 IS NULL OR tc.tipo_candidatura = :4)
        AND (:5 IS NULL OR tc.Codigo = :6)
        AND (NVL(tc1.total, 0) + NVL(tc2.total, 0) - NVL(cc.concluidas, 0)) = 1
    `;

    const sqlData = `
      ${commonCTEs}
      SELECT
          tp.Nome_Completo AS nome,
          tp.Bilhete_Identidade AS bilhete,
          tp.Sexo AS genero,
          tm.Codigo AS matricula,
          tc.Designacao AS curso
      FROM FK2_TB_MATRICULAS tm
      INNER JOIN FK2_TB_ADMISSAO ta ON ta.codigo = tm.Codigo_Aluno
      INNER JOIN FK2_TB_PREINSCRICAO tp ON tp.Codigo = ta.pre_incricao
      INNER JOIN FK2_TB_CURSOS tc ON tc.Codigo = tm.Codigo_Curso
      LEFT JOIN total_cadeiras tc1 ON tc1.codigo_curso = tm.Codigo_Curso
      LEFT JOIN total_cadeiras_candidatura tc2 ON tc2.codigo_curso = tp.Curso_Candidatura AND tp.Curso_Candidatura != tm.Codigo_Curso
      LEFT JOIN cadeiras_concluidas cc ON cc.codigo_matricula = tm.Codigo
      ${whereClause}
      ORDER BY tp.Nome_Completo
      OFFSET :7 ROWS FETCH NEXT :8 ROWS ONLY
    `;

    const sqlCount = `
      ${commonCTEs}
      SELECT COUNT(*) AS total
      FROM FK2_TB_MATRICULAS tm
      INNER JOIN FK2_TB_ADMISSAO ta ON ta.codigo = tm.Codigo_Aluno
      INNER JOIN FK2_TB_PREINSCRICAO tp ON tp.Codigo = ta.pre_incricao
      INNER JOIN FK2_TB_CURSOS tc ON tc.Codigo = tm.Codigo_Curso
      LEFT JOIN total_cadeiras tc1 ON tc1.codigo_curso = tm.Codigo_Curso
      LEFT JOIN total_cadeiras_candidatura tc2 ON tc2.codigo_curso = tp.Curso_Candidatura AND tp.Curso_Candidatura != tm.Codigo_Curso
      LEFT JOIN cadeiras_concluidas cc ON cc.codigo_matricula = tm.Codigo
      ${whereClause}
    `;

    // Ordem exata dos placeholders na query
    const dataParams = [
      anoLectivo,        // :1
      anoLectivo,        // :2
      tipoCandidatura || null, // :3
      tipoCandidatura || null, // :4
      curso || null,           // :5
      curso || null,           // :6
      offset,            // :7
      limit              // :8
    ];

    const countParams = [
      anoLectivo,        // :1
      anoLectivo,        // :2
      tipoCandidatura || null, // :3
      tipoCandidatura || null, // :4
      curso || null,           // :5
      curso || null            // :6
    ];

    try {
      const [data, countResult] = await Promise.all([
        this.dataSource.query(sqlData, dataParams),
        this.dataSource.query(sqlCount, countParams)
      ]);

      const total = Number(countResult[0]?.TOTAL || 0);

      return {
        data: toLowerCaseKeys(data),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Erro ao buscar finalistas:', error);
      throw error;
    }
  }
}