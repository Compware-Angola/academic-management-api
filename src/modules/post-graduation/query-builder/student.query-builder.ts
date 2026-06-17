import { StudentsQueryDto } from "../dto/guidance-research-management";

export const BASE_JOINS = `
    INNER JOIN FK2_TB_ADMISSAO tba 
        ON tba.CODIGO = tbm.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO tbp 
        ON tbp.CODIGO = tba.PRE_INCRICAO
    INNER JOIN FK2_TB_CURSOS tbc 
        ON tbc.Codigo = tbm.Codigo_Curso
    INNER JOIN FK2_TB_TIPO_CANDIDATURA tbca
        ON tbca.ID = tbp.CODIGO_TIPO_CANDIDATURA
`
export const buildStudentWhereClause =(filters:StudentsQueryDto)=>{
   const clauses: string[] = [];
   const params: Record<string, any> = {};
   clauses.push(`tbp.CODIGO_TIPO_CANDIDATURA IN (2,3)`);
   if(filters.anoLectivo){
    clauses.push(`tbp.ANOLECTIVO = :anoLectivo`);
    params.anoLectivo = filters.anoLectivo;
   }
   if(filters.search) {
    const subClauses = [
      `UPPER(tbp.Nome_Completo) LIKE UPPER(:search)`,
      `UPPER(tbp.BILHETE_IDENTIDADE) LIKE UPPER(:search)`,
      `UPPER(tbp.CODIGO) LIKE UPPER(:search)`,
    ]
    clauses.push(`(${subClauses.join(' OR ')})`);
    params.search = `%${filters.search}%`;
   }
   if(filters.curso) {
    clauses.push(`tbc.CODIGO = :curso`);
    params.curso = filters.curso;
   }
   if(filters.tipoCandidatura) {
    clauses.push(`tbp.CODIGO_TIPO_CANDIDATURA = :tipoCandidatura`);
    params.tipoCandidatura = filters.tipoCandidatura;
   }
   return {
    clauses,
    params: params
   }
}

export const buildStudentQuery = (
  whereClause: string,
) => {
  return `
    SELECT
      tbp.Nome_Completo AS nome,
      tbp.BILHETE_IDENTIDADE AS bilhete_identidade,
      tbp.CODIGO AS codigo_matricula,
      tbp.Sexo AS genero,
      tbc.Designacao AS curso,
      tbca.DESIGNACAO AS candidatura
    FROM FK2_TB_MATRICULAS tbm
    ${BASE_JOINS}
    WHERE ${whereClause}
    ORDER BY tbp.Nome_Completo
    OFFSET :offset ROWS
    FETCH NEXT :limit ROWS ONLY
  `;
};

export const buildStudentCountQuery = (whereClause: string) => {
    return `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_TB_MATRICULAS tbm
    ${BASE_JOINS}
    WHERE ${whereClause}
    `
}