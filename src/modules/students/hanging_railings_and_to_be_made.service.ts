import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindPlanPorClasseDTO } from './dto/FindPlanPorClasseDTO';

export interface FindGradeCursoDTO {
    codigoMatricula: number;
    codigoCurso: number;
}

export interface FindGradeCursoReturnDTO {
    codigo: number;
    semestre: string;
    disciplina: string;
    duracao: string;
    nota: number;
    codigo_disciplina: number;
    codigo_classe: number;
    classe: string;
    codigo_grade_aluno?: number;
}

export interface FindMatriculaDetails {
    codigo_matricula: number;
    estado: string;
    nome_completo: string;
    bi: string;
    curso: string;
    codigo_curso: number;
    candidatura: string;
}


@Injectable()
export class HangingRailingsAndToBeMadeService {
    constructor(private readonly dataSource: DataSource) { }

    async getNextClass(matricula: number, anoLectivo?: number) {
        const anoLectivoFilter = anoLectivo
            ? `AND ftgca.CODIGO_ANO_LECTIVO = :anoLectivo`
            : `AND ftgca.CODIGO_ANO_LECTIVO = (
                SELECT MAX(CODIGO_ANO_LECTIVO)
                FROM FK2_TB_GRADE_CURRICULAR_ALUNO
                WHERE CODIGO_MATRICULA = m.CODIGO
                  AND CODIGO_STATUS_GRADE_CURRICULAR IN (2, 3)
              )`;

        const sql = `
            SELECT
                cl.CODIGO    AS CLASSE_CODIGO,
                c.DURACAO    AS DURACAO,
                CASE WHEN ce.CODIGO_CURSO_ESPECIALIDADE IS NOT NULL THEN 1 ELSE 0 END AS IS_ESPECIALIDADE
            FROM FK2_TB_MATRICULAS m
            INNER JOIN FK2_TB_CURSOS c
                ON c.CODIGO = m.CODIGO_CURSO
            LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO ftgca
                ON ftgca.CODIGO_MATRICULA = m.CODIGO
            LEFT JOIN FK2_TB_GRADE_CURRICULAR ftgc
                ON ftgc.CODIGO = ftgca.CODIGO_GRADE_CURRICULAR
            LEFT JOIN FK2_TB_CLASSES cl
                ON cl.CODIGO = ftgc.CODIGO_CLASSE
            LEFT JOIN FK2_TB_CURSO_ESPECIALIDADE ce
                ON ce.CODIGO_CURSO_ESPECIALIDADE = c.CODIGO
            WHERE m.CODIGO = :matricula
              AND ftgca.CODIGO_STATUS_GRADE_CURRICULAR IN (2, 3)
              ${anoLectivoFilter}
            GROUP BY cl.CODIGO, c.DURACAO, ce.CODIGO_CURSO_ESPECIALIDADE
            ORDER BY COUNT(ftgca.CODIGO) DESC
            FETCH FIRST 1 ROWS ONLY
        `;

        const queryParams: any = { matricula };
        if (anoLectivo) queryParams.anoLectivo = anoLectivo;

        const result = await this.dataSource.query(sql, queryParams as any);
        console.log('result', result);


        if (!result || result.length === 0) {
            throw new BadRequestException(`Matrícula ${matricula} não encontrada`);
        }

        const classeAtual = result[0].CLASSE_CODIGO;
        const duracao = result[0].DURACAO;
        const isEspecialidade = result[0].IS_ESPECIALIDADE === 1;

        if (classeAtual === null || classeAtual === undefined) {
            return 1;
        }

        if (isEspecialidade) {
            const sql = `
                SELECT 
                    CLASSE
                FROM FK2_TB_CONFIRMACOES
                WHERE CODIGO_MATRICULA = :matricula
                ORDER BY CLASSE DESC
                FETCH FIRST 1 ROW ONLY
            `;
            const result = await this.dataSource.query(sql, { matricula } as any);
            return result[0].CLASSE;
        }

        if (classeAtual > duracao) {
            throw new BadRequestException(
                `Matrícula ${matricula} já atingiu a classe máxima (${duracao})`
            );
        }
        if (classeAtual === duracao) {
            return classeAtual;
        }

        return classeAtual + 1;
    }

    /**
     * Retorna:
     * - gradesPendentes: disciplinas de classes INFERIORES à classe informada
     *   que o aluno ainda NÃO tem nota lançada (pendentes)
     * - gradesAFazer: disciplinas da classe IGUAL à informada que o aluno
     *   ainda NÃO concluiu (nota null ou < 10)
     */
    async findHangingRailingsAndToBeMade(params: FindPlanPorClasseDTO) {
        const { codigoMatricula, codigoClasse } = params;

        const matricula = await this.getMatriculaDetails(codigoMatricula);

        const codigoCursoAnterior = await this.findCursoAnteriorEspecialidade(
            matricula.codigo_curso,
        );

        const gradesCursoQueries: Promise<FindGradeCursoReturnDTO[]>[] = [
            this.findGradeCurso({
                codigoCurso: matricula.codigo_curso,
                codigoMatricula: matricula.codigo_matricula,
            }),
        ];

        if (codigoCursoAnterior !== null) {
            gradesCursoQueries.push(
                this.findGradeCurso({
                    codigoCurso: codigoCursoAnterior,
                    codigoMatricula: matricula.codigo_matricula,
                }),
            );
        }

        const gradesPorCurso = await Promise.all(gradesCursoQueries);
        const todasGradesCurso = gradesPorCurso.flat();

        const gradesSemDuplicidade =
            this.deduplicateGradesCurso(todasGradesCurso);

        const gradesPendentes = gradesSemDuplicidade
            .filter(
                (g) =>
                    g.codigo_classe < codigoClasse &&
                    (g.nota === null || g.nota === undefined),
            )
            .sort((a, b) => a.codigo_classe - b.codigo_classe);

        const gradesAFazer = gradesSemDuplicidade
            .filter(
                (g) =>
                    g.codigo_classe === codigoClasse &&
                    (g.nota === null || g.nota === undefined || g.nota < 10),
            )
            .sort((a, b) => a.codigo_disciplina - b.codigo_disciplina);

        return {
            matricula,
            gradesPendentes,
            totalGradesPendentes: gradesPendentes.length,
            gradesAFazer,
            totalGradesAFazer: gradesAFazer.length,
            isEspecializacao: codigoCursoAnterior !== null,
        };
    }

    /**
     * Verifica se o curso é de especialização.
     * Retorna o CODIGO_CURSO anterior (base) se for, ou null se não for.
     */
    private async findCursoAnteriorEspecialidade(
        codigoCursoEspecialidade: number,
    ): Promise<number | null> {
        const sql = `
      SELECT CODIGO_CURSO AS codigo_curso_anterior
      FROM FK2_TB_CURSO_ESPECIALIDADE
      WHERE CODIGO_CURSO_ESPECIALIDADE = :codigoCursoEspecialidade
    `;

        const result = await this.dataSource.query(sql, {
            codigoCursoEspecialidade,
        } as any);

        if (!result?.length) return null;

        const row = toLowerCaseKeys(result[0]);
        return row.codigo_curso_anterior ?? null;
    }

    private async getMatriculaDetails(
        codigoMatricula: number,
    ): Promise<FindMatriculaDetails> {
        const sql = `
      SELECT
        m.codigo               AS codigo_matricula,
        m.ESTADO_MATRICULA     AS estado,
        p.NOME_COMPLETO        AS nome_completo,
        p.BILHETE_IDENTIDADE   AS bi,
        c.designacao           AS curso,
        c.codigo               AS codigo_curso,
        ca.DESIGNACAO          AS candidatura
      FROM FK2_TB_MATRICULAS m
      INNER JOIN FK2_TB_CURSOS c
        ON c.codigo = m.CODIGO_CURSO
      INNER JOIN FK2_TB_ADMISSAO a
        ON a.codigo = m.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO p
        ON p.codigo = a.PRE_INCRICAO
      INNER JOIN FK2_TB_TIPO_CANDIDATURA ca
        ON ca.ID = c.TIPO_CANDIDATURA
      WHERE m.codigo = :codigoMatricula
    `;

        const result = await this.dataSource.query(sql, {
            codigoMatricula,
        } as any);

        if (!result || result.length === 0) {
            throw new NotFoundException('Matrícula não encontrada');
        }

        return toLowerCaseKeys(result[0]);
    }

    private async findGradeCurso(
        params: FindGradeCursoDTO,
    ): Promise<FindGradeCursoReturnDTO[]> {
        const { codigoCurso, codigoMatricula } = params;

        const sql = `
      WITH grade_base AS (
        SELECT
          g.CODIGO,
          g.CODIGO_DISCIPLINA,
          s.DESIGNACAO   AS SEMESTRE,
          d.DESIGNACAO   AS DISCIPLINA,
          dur.DESIGNACAO AS DURACAO,
          g.CODIGO_CLASSE,
          cl.DESIGNACAO  AS CLASSE
        FROM FK2_TB_GRADE_CURRICULAR g
        INNER JOIN FK2_TB_PLANO_CURRICULAR_GRADE pg
          ON pg.CODIGO_GRADE_CURRICULAR = g.CODIGO
        INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO pgc
          ON pgc.CODIGO = pg.CODIGO_PLANO_CURRICULAR_CURSO
        INNER JOIN FK2_TB_DISCIPLINAS d
          ON d.CODIGO = g.CODIGO_DISCIPLINA
        INNER JOIN FK2_TB_CLASSES cl
          ON cl.CODIGO = g.CODIGO_CLASSE
        INNER JOIN FK2_TB_SEMESTRES s
          ON s.CODIGO = g.CODIGO_SEMESTRE
        INNER JOIN FK2_TB_DURACAO dur
          ON dur.CODIGO = d.DURACAO
        WHERE g.CODIGO_CURSO = :codigoCurso
          AND g.STATUS_      = 1
          AND d.STATUS_      = 1
      ),
      aluno_base AS (
        SELECT
          al.CODIGO               AS CODIGO_GRADE_ALUNO,
          al.CODIGO_GRADE_CURRICULAR,
          al.NOTA,
          ga.CODIGO_DISCIPLINA
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
        INNER JOIN FK2_TB_GRADE_CURRICULAR ga
          ON ga.CODIGO = al.CODIGO_GRADE_CURRICULAR
        WHERE al.CODIGO_MATRICULA = :codigoMatricula
          AND al.NOTA >= 10
          AND al.CODIGO_STATUS_GRADE_CURRICULAR NOT IN (5, 4)
      )
      SELECT DISTINCT
        gb.CODIGO,
        gb.SEMESTRE,
        gb.DISCIPLINA,
        gb.DURACAO,
        ab.NOTA,
        gb.CODIGO_DISCIPLINA,
        gb.CODIGO_CLASSE,
        gb.CLASSE,
        ab.CODIGO_GRADE_ALUNO
      FROM grade_base gb
      LEFT JOIN aluno_base ab
        ON ab.CODIGO_GRADE_CURRICULAR = gb.CODIGO
        OR ab.CODIGO_DISCIPLINA       = gb.CODIGO_DISCIPLINA
      ORDER BY gb.CODIGO_CLASSE ASC
    `;

        const result = await this.dataSource.query(sql, {
            codigoMatricula,
            codigoCurso,
        } as any);

        if (!result?.length) return [];

        return toLowerCaseKeys(result);
    }

    private deduplicateGradesCurso(
        data: FindGradeCursoReturnDTO[],
    ): FindGradeCursoReturnDTO[] {
        const map = new Map<string, FindGradeCursoReturnDTO>();

        for (const item of data) {
            const key = item.disciplina?.trim().toUpperCase();
            const existing = map.get(key);

            if (!existing) {
                map.set(key, item);
                continue;
            }
            const itemHasNota = item.nota != null;
            const existingHasNota = existing.nota != null;

            if (!existingHasNota && itemHasNota) {
                map.set(key, item);
            }
        }

        return Array.from(map.values());
    }
}