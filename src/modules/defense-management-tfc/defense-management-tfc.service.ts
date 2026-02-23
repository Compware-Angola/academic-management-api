import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FinalistStudentDto, ListFinalistStudentsQueryDto, ListFinalistStudentsResponseDto } from './dto';

@Injectable()
export class DefenseManagementTfcService {
  constructor(private readonly dataSource: DataSource) { }
 

async listFinalistStudents(
  query: ListFinalistStudentsQueryDto  
): Promise<ListFinalistStudentsResponseDto> {
  const { anoLectivo, tipoCandidatura, curso, page = 1, limit = 10 } = query;

  const offset = (page - 1) * limit;

  // Query base: pega os dados da página
  const sql = `
WITH total_cadeiras AS (
    SELECT tpcc.codigo_curso, COUNT(tpcg.codigo_grade_curricular) AS total
    FROM FK2_TB_PLANO_CURRICULAR_GRADE tpcg
    INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc 
        ON tpcg.codigo_plano_curricular_curso = tpcc.codigo
    WHERE tpcc.codigo_ano_lectivo = :anoLectivo
    GROUP BY tpcc.codigo_curso
),
total_cadeiras_candidatura AS (
    SELECT tp2.Curso_Candidatura AS codigo_curso, COUNT(tpcg.codigo_grade_curricular) AS total
    FROM FK2_TB_PREINSCRICAO tp2
    INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc
        ON tpcc.codigo_curso = tp2.Curso_Candidatura
    INNER JOIN FK2_TB_PLANO_CURRICULAR_GRADE tpcg
        ON tpcg.codigo_plano_curricular_curso = tpcc.codigo
    WHERE tpcc.codigo_ano_lectivo = :anoLectivo
    GROUP BY tp2.Curso_Candidatura
)
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
LEFT JOIN total_cadeiras_candidatura tc2 
       ON tc2.codigo_curso = tp.Curso_Candidatura AND tp.Curso_Candidatura != tm.Codigo_Curso
WHERE (:tipoCandidatura IS NULL OR tc.tipo_candidatura = :tipoCandidatura)
  AND (:curso IS NULL OR tc.Codigo = :curso)
ORDER BY tp.Nome_Completo
OFFSET :offset ROWS
FETCH NEXT :limit ROWS ONLY
`;

  const bindParams: any = {
    anoLectivo,
    tipoCandidatura: tipoCandidatura || null,
    curso: curso || null,
    offset,
    limit
  };

  // Consulta a página
  const data = await this.dataSource.query(sql, bindParams);

  // Query separada para contar o total
  const countSql = `
SELECT COUNT(*) AS total
FROM FK2_TB_MATRICULAS tm
INNER JOIN FK2_TB_ADMISSAO ta ON ta.codigo = tm.Codigo_Aluno
INNER JOIN FK2_TB_PREINSCRICAO tp ON tp.Codigo = ta.pre_incricao
INNER JOIN FK2_TB_CURSOS tc ON tc.Codigo = tm.Codigo_Curso
WHERE (:tipoCandidatura IS NULL OR tc.tipo_candidatura = :tipoCandidatura)
  AND (:curso IS NULL OR tc.Codigo = :curso)
`;
const countBindParams: any = {
  tipoCandidatura: tipoCandidatura || null,
  curso: curso || null,
};
  const countResult = await this.dataSource.query(countSql, countBindParams);
  const total = Number(countResult[0].TOTAL);

  return {
    data: toLowerCaseKeys(data),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

}