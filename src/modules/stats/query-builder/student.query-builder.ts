export function buildStudentEnrollmentsQuery() {
    return `
    SELECT
        COUNT(DISTINCT matricula.CODIGO_ALUNO) AS TOTAL,
        anolectivo.CODIGO,
        anolectivo.DESIGNACAO AS ANO_LECTIVO
    FROM FK2_TB_PREINSCRICAO preins
    INNER JOIN FK2_TB_ADMISSAO admissao
        ON preins.CODIGO = admissao.PRE_INCRICAO
    INNER JOIN FK2_TB_MATRICULAS matricula
        ON admissao.CODIGO = matricula.CODIGO_ALUNO
    INNER JOIN FK2_TB_ANO_LECTIVO anolectivo
        ON anolectivo.CODIGO = preins.ANOLECTIVO
    GROUP BY
        anolectivo.CODIGO,
        anolectivo.DESIGNACAO
    ORDER BY
        anolectivo.CODIGO DESC
  `
}