export function buildStudentEnrollmentsQuery() {
    return `
    WITH alunos_por_ano AS (

        SELECT
            anolectivo.CODIGO,

            anolectivo.DESIGNACAO AS ANO_LECTIVO,

            COUNT(DISTINCT matricula.CODIGO_ALUNO) AS TOTAL,

            CASE
                WHEN INSTR(anolectivo.DESIGNACAO, '-') > 0
                THEN TO_NUMBER(
                    SUBSTR(
                        anolectivo.DESIGNACAO,
                        1,
                        4
                    )
                )
                ELSE TO_NUMBER(
                    anolectivo.DESIGNACAO
                )
            END AS ANO_INICIAL


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
    )


    SELECT
        CODIGO,

        ANO_LECTIVO,

        TOTAL AS NOVOS_ALUNOS,


        SUM(TOTAL) OVER (
            ORDER BY ANO_INICIAL
            ROWS BETWEEN UNBOUNDED PRECEDING
            AND CURRENT ROW
        ) AS TOTAL_ACUMULADO


    FROM alunos_por_ano


    ORDER BY ANO_INICIAL DESC
    `
}