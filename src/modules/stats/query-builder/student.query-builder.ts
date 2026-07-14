import { StudentDto } from '../dto/student.dto'


export function buildStudentStatsWhereClause(
    query: StudentDto,
) {
    const clauses: string[] = [
        `anolectivo.STATUS_ = 1`,
        `anolectivo.ESTADO = 'Activo'`,
    ]
    const params: Record<string, any> = {}
    if (query.codigoCandidatura) {

        clauses.push(
            `anolectivo.CODIGO_TIPO_CANDIDATURA = :codigoCandidatura`,
        )
        params.codigoCandidatura =
            query.codigoCandidatura
    }
    return {
        clauses,
        params,
    }
}



export function buildStudentEnrollmentsQuery(
    whereClause: string,
) {

    return `

    SELECT 
        COUNT(DISTINCT matricula.CODIGO_ALUNO) AS TOTAL,
        anolectivo.DESIGNACAO AS ANO_LECTIVO,
        tipo_candidatura.ID AS CODIGO_CANDIDATURA,
        tipo_candidatura.DESIGNACAO AS TIPO_CANDIDATURA

    FROM FK2_TB_PREINSCRICAO preins

    INNER JOIN FK2_TB_ADMISSAO admissao
        ON preins.CODIGO = admissao.PRE_INCRICAO

    INNER JOIN FK2_TB_MATRICULAS matricula
        ON admissao.CODIGO = matricula.CODIGO_ALUNO

    INNER JOIN FK2_TB_ANO_LECTIVO anolectivo
        ON anolectivo.CODIGO = preins.ANOLECTIVO

    INNER JOIN FK2_TB_TIPO_CANDIDATURA tipo_candidatura
        ON tipo_candidatura.ID = anolectivo.CODIGO_TIPO_CANDIDATURA

    WHERE ${whereClause}

    GROUP BY 
        anolectivo.DESIGNACAO,
        tipo_candidatura.ID,
        tipo_candidatura.DESIGNACAO

    `
}



export function buildStudentTotalQuery(
    whereClause: string,
) {

    return `
    SELECT
        COUNT(DISTINCT grade_aluno.CODIGO_MATRICULA) AS TOTAL,
        anolectivo.DESIGNACAO AS ANO_LECTIVO,
        tipo_candidatura.ID AS CODIGO_CANDIDATURA,
        tipo_candidatura.DESIGNACAO AS TIPO_CANDIDATURA

    FROM FK2_TB_GRADE_CURRICULAR_ALUNO grade_aluno

    INNER JOIN FK2_TB_ANO_LECTIVO anolectivo
        ON anolectivo.CODIGO =
           grade_aluno.CODIGO_ANO_LECTIVO

    INNER JOIN FK2_TB_TIPO_CANDIDATURA tipo_candidatura
        ON tipo_candidatura.ID = anolectivo.CODIGO_TIPO_CANDIDATURA

    WHERE ${whereClause}

    AND grade_aluno.CODIGO_STATUS_GRADE_CURRICULAR = 2

    GROUP BY 
        anolectivo.DESIGNACAO,
        tipo_candidatura.ID,
        tipo_candidatura.DESIGNACAO

    `
}