import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateStudentEnrollmentUC } from './dto/create-student-enrollment-uc';
import { STATUS_GRADE } from '../common/enums/status.grade';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

interface FindGradeCursoDTO {
  codigoMatricula: number;
  codigoCurso: number;
}
interface FindGradeCursoReturnDTO {
  codigo: number;
  semestre: string;
  disciplina: string;
  duracao: string;
  nota: number;
  codigo_disciplina: number;
  codigo_classe: number;
  classe: string;
}

export interface FindGradeAlunoAprovadoReturnDTO {
  codigo: number;
  semestre: string;
  disciplina: string;
  duracao: string;
  nota: number;
  codigo_disciplina: number;
  codigo_classe: number;
  classe: string;
}
interface FindMatriculaDetails {
  codigo_matricula: number;
  estado: string;
  nome_completo: string;
  bi: string;
  curso: string;
  codigo_curso: number;
  candidatura: string;
}

@Injectable()
export class StudentsResultPlanService {
  constructor(private readonly dataSource: DataSource) {}

  public async findPlan(codigoMatricula: number) {
    const matricula = await this.getMatriculaDetails(codigoMatricula);
    const gradesAluno = await this.findGradesAprovadasAluno(codigoMatricula);
    if (matricula.estado.toUpperCase() == 'DIPLOMADO') {
      return {
        grades: gradesAluno,
        totalGradesCurso: gradesAluno.length,
        totalGrasesAluno: gradesAluno.length,
      };
    }

    const gradesCurso = await this.findGradeCurso({
      codigoCurso: matricula.codigo_curso,
      codigoMatricula: matricula.codigo_matricula,
    });
    const gradesCursoSemDuplicidade =
      await this.deduplicateGradesCurso(gradesCurso);
    const disciplinasExcedentes = gradesAluno.filter(
      (t) =>
        !gradesCursoSemDuplicidade.some(
          (n) =>
            n.codigo_disciplina == t.codigo_disciplina ||
            n.disciplina == t.disciplina,
        ),
    );
    const gradesCursoIncluindoExcendentes = [
      ...gradesCursoSemDuplicidade,
      ...disciplinasExcedentes,
    ];
    return {
      grades: gradesCursoIncluindoExcendentes,
      totalGradesCurso: gradesCursoIncluindoExcendentes.length,
      totalGrasesAluno: gradesAluno.length,
    };
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
        g.CODIGO_DISCIPLINA AS CODIGO_DISCIPLINA,
        s.DESIGNACAO AS SEMESTRE,
        d.DESIGNACAO AS DISCIPLINA,
        dur.DESIGNACAO AS DURACAO,
        g.CODIGO_CLASSE AS CODIGO_CLASSE,
        cl.DESIGNACAO   AS CLASSE
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
      AND g.STATUS_ = 1
      AND d.STATUS_ = 1
    ),
    aluno_base AS (
        SELECT
            al.CODIGO_GRADE_CURRICULAR,
            al.NOTA AS NOTA,
            ga.CODIGO_DISCIPLINA,
            d.DESIGNACAO as DISCIPLINA
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO al

        INNER JOIN FK2_TB_GRADE_CURRICULAR ga
            ON ga.CODIGO = al.CODIGO_GRADE_CURRICULAR
        INNER JOIN FK2_TB_DISCIPLINAS d
            ON d.codigo = ga.CODIGO_DISCIPLINA
        WHERE 1=1
          AND al.CODIGO_MATRICULA = :codigoMatricula
          AND al.NOTA >= 10
          AND al.CODIGO_STATUS_GRADE_CURRICULAR NOT IN (5,4)
    )
    SELECT DISTINCT
        gb.CODIGO,
        gb.SEMESTRE,
        gb.DISCIPLINA,
        gb.DURACAO,
        ab.NOTA,
        gb.CODIGO_DISCIPLINA,
        gb.CODIGO_CLASSE,
        gb.CLASSE
    FROM grade_base gb
    LEFT JOIN aluno_base ab
        ON ab.CODIGO_GRADE_CURRICULAR = gb.CODIGO
        OR ab.CODIGO_DISCIPLINA = gb.CODIGO_DISCIPLINA
        or TRIM(UPPER(ab.DISCIPLINA)) = TRIM(UPPER(gb.DISCIPLINA))
    ORDER BY gb.CODIGO_CLASSE ASC
    `;
    const result = await this.dataSource.query(sql, {
      codigoMatricula,
      codigoCurso,
    } as any);
    if (!result || result.length == 0) return [];
    return toLowerCaseKeys(result);
  }
  private async findGradesAprovadasAluno(
    codigoMatricula: number,
  ): Promise<FindGradeAlunoAprovadoReturnDTO[]> {
    const sql = `
    SELECT
        ga.CODIGO                               AS CODIGO,
        al.NOTA                                 AS NOTA,
        ga.CODIGO_DISCIPLINA                    AS CODIGO_DISCIPLINA,
        d.DESIGNACAO                            AS DISCIPLINA,
        ga.CODIGO_CLASSE                        AS CODIGO_CLASSE,
        cl.DESIGNACAO                           AS CLASSE,
        dur.DESIGNACAO                          AS DURACAO,
        s.DESIGNACAO                            AS SEMESTRE

    FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
    INNER JOIN FK2_TB_GRADE_CURRICULAR ga
        ON ga.CODIGO = al.CODIGO_GRADE_CURRICULAR
    INNER JOIN FK2_TB_DISCIPLINAS d
        ON d.codigo = ga.CODIGO_DISCIPLINA
    INNER JOIN FK2_TB_CLASSES cl
        ON cl.CODIGO = ga.CODIGO_CLASSE

    INNER JOIN FK2_TB_SEMESTRES s
        ON s.CODIGO = ga.CODIGO_SEMESTRE

    INNER JOIN FK2_TB_DURACAO dur
        ON dur.CODIGO = d.DURACAO

    WHERE 1=1
      AND al.CODIGO_MATRICULA = :codigoMatricula
      AND al.NOTA >= 10
      AND al.CODIGO_STATUS_GRADE_CURRICULAR NOT IN (5,4)
    ORDER BY ga.CODIGO_CLASSE
    `;
    const result = await this.dataSource.query(sql, {
      codigoMatricula,
    } as any);

    if (!result || result.length == 0) return [];
    return toLowerCaseKeys(result);
  }

  private async deduplicateGradesCurso(
    data: FindGradeCursoReturnDTO[],
  ): Promise<FindGradeCursoReturnDTO[]> {
    const map = new Map<string, FindGradeCursoReturnDTO>();

    for (const item of data) {
      const key = `${item.codigo_disciplina}-${item.disciplina?.trim().toUpperCase()}`;

      const existing = map.get(key);

      if (!existing) {
        map.set(key, item);
        continue;
      }

      const currentHasNota = item.nota !== null && item.nota !== undefined;
      const existingHasNota =
        existing.nota !== null && existing.nota !== undefined;

      if (!currentHasNota && existingHasNota) {
        map.set(key, item);
      }
    }

    return Array.from(map.values());
  }
}
