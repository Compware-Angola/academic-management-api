import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { toLowerCaseKeys } from "../util/toLowerCaseKeys";

@Injectable()
export class CursosService {
    constructor(private readonly dataSource: DataSource) {}
    async buscarEspecialidadesPorCurso(cursoId: number) {
    const especialidades = await this.dataSource.query(
        `
        SELECT c.CODIGO as codigo, c.DESIGNACAO as designacao
        FROM FK2_TB_CURSOS c
        INNER JOIN FK2_TB_CURSO_ESPECIALIDADE e ON c.CODIGO = e.CODIGO_CURSO_ESPECIALIDADE
        WHERE e.CODIGO_CURSO = :1
        `,
        [cursoId],
      );
    return toLowerCaseKeys(especialidades);
    }
}