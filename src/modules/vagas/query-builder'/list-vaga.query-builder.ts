import { FilterVagasDto } from '../dto/filter-vagas.dto';

export const BASE_JOINS = `
INNER JOIN FK2_TB_CURSOS C
    ON V.CURSO_ID = C.CODIGO
INNER JOIN FK2_TB_PERIODOS P
    ON V.PERIODO_ID = P.CODIGO
INNER JOIN FK2_TB_ANO_LECTIVO A
    ON V.ANO_LECTIVO_ID = A.CODIGO
`;

export function buildWhereClauseListVagas(filters: FilterVagasDto) {
    const clauses: string[] = [];
    const params: Record<string, any> = {};

    if (filters.cursoId) {
        clauses.push(`V.CURSO_ID = :cursoId`);
        params.cursoId = filters.cursoId;
    }

    if (filters.periodoId) {
        clauses.push(`V.PERIODO_ID = :periodoId`);
        params.periodoId = filters.periodoId;
    }

    if (filters.anoLetivoId) {
        clauses.push(`V.ANO_LECTIVO_ID = :anoLetivoId`);
        params.anoLetivoId = filters.anoLetivoId;
    }

    if (filters.tipoCandidaturaId) {
        clauses.push(`C.TIPO_CANDIDATURA = :tipoCandidaturaId`);
        params.tipoCandidaturaId = filters.tipoCandidaturaId;
    }
    return {
        clauses,
        params,
    };
}

export function buildDataQueryListVagas(
    tableName: string,
    whereClause: string,
) {
    return `
SELECT
    V.ID,
    V.CURSO_ID,
    C.DESIGNACAO AS CURSO,
    V.CURSOSOPCIONAIS,
    V.PERIODO_ID,
    P.DESIGNACAO AS PERIODO,
    V.ANO_LECTIVO_ID,
    A.DESIGNACAO AS ANO_LECTIVO,
    V.NUM_VAGAS,

    V.NUM_VAGAS -
    (
        SELECT COUNT(DISTINCT tbc.Codigo_Matricula)
        FROM fk2_tb_confirmacoes tbc
        INNER JOIN fk2_tb_matriculas tbm
            ON tbc.Codigo_Matricula = tbm.Codigo
        INNER JOIN fk2_tb_admissao ta
            ON tbm.Codigo_Aluno = ta.codigo
        INNER JOIN fk2_tb_preinscricao tpri
            ON ta.pre_incricao = tpri.Codigo
        WHERE tpri.Curso_Candidatura = V.CURSO_ID
          AND tpri.Codigo_Turno = V.PERIODO_ID
          AND tpri.anoLectivo = V.ANO_LECTIVO_ID
    ) AS VAGAS_DISPONIVEIS,

    V.CREATED_AT,
    V.UPDATED_AT

FROM ${tableName} V
${BASE_JOINS}

WHERE ${whereClause}

ORDER BY V.CREATED_AT DESC

OFFSET :offset ROWS
FETCH NEXT :limit ROWS ONLY
`;
}

export function buildCountQueryListVagas(
    tableName: string,
    whereClause: string,
) {
    return `
SELECT COUNT(*) AS TOTAL

FROM ${tableName} V

${BASE_JOINS}

WHERE ${whereClause}
`;
}