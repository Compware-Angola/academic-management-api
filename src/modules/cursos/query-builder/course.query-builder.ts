import { CoursesQueryDto } from "../dtos/course.dto";

export const buildCursosWhereClause = (filters: CoursesQueryDto) => {
    const clauses:string[] = []
    const params: Record<string, any> = {};

    const { search,level,tipocandidatura } = filters;

    if(level && !tipocandidatura) {
        if(level === "GRADUATION") {
            clauses.push(`TIPO_CANDIDATURA IN(1)`);
        }
        if(level==="POST_GRADUATION") {
            clauses.push(`TIPO_CANDIDATURA IN(2,3)`);
        }
    }

    if(tipocandidatura){
        clauses.push(`TIPO_CANDIDATURA = :tipocandidatura`);
        params.tipocandidatura = tipocandidatura;
    }

    if(filters.falcudadeId){
        clauses.push(`FACULDADE_ID = :falcudadeId`);
        params.falcudadeId = filters.falcudadeId;
    }

    if(search) {
        clauses.push(`UPPER(DESIGNACAO) LIKE UPPER(:search)`);
        params.search = `%${search}%`;
    }
    return {clauses,params}
}

export const buildCursosQuery = (whereClause:string) => {
    return `
    SELECT
        CODIGO as codigo,
        DESIGNACAO as designacao,
        DURACAO as duracao
    FROM FK2_TB_CURSOS
    WHERE ${whereClause}
    ORDER BY DESIGNACAO
    OFFSET :offset ROWS
    FETCH NEXT :limit ROWS ONLY
    `
}

export const buildCursosCountQuery = (whereClause: string) => {
    return `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_TB_CURSOS
    WHERE ${whereClause}
    `
}