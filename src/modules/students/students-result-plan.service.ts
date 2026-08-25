import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { AnoLectivoUtil } from '../util/current-academic-year';

interface FindGradeCursoDTO {
  codigoMatricula: number;
  codigoCurso: number;
  codigoAnoLectivo: number;
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
  codigo_grade_aluno?: number;
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
  codigo_grade_aluno?: number;
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
  constructor(
    private readonly dataSource: DataSource,
    private readonly anoLectivoUtil: AnoLectivoUtil,
  ) {}

  public async findPlan(codigoMatricula: number) {
    const [matricula, gradesAluno, anoLectivoAtivo] = await Promise.all([
      this.getMatriculaDetails(codigoMatricula),
      this.findGradesAprovadasAluno(codigoMatricula),
      this.anoLectivoUtil.getAnoAtualId(),
    ]);

    if (matricula.estado.toUpperCase() === 'DIPLOMADO') {
      return {
        grades: gradesAluno,
        totalGradesCurso: gradesAluno.length,
        totalGrasesAluno: gradesAluno.length,
        isEspecializacao: false,
      };
    }

    // Verificar se o curso actual é especialização e obter o curso anterior
    const codigoCursoAnterior = await this.findCursoAnteriorEspecialidade(
      matricula.codigo_curso,
    );

    // Buscar grades do curso actual (e do curso anterior se existir), em paralelo
    const gradesCursoQueries: Promise<FindGradeCursoReturnDTO[]>[] = [
      this.findGradeCurso({
        codigoCurso: matricula.codigo_curso,
        codigoMatricula: matricula.codigo_matricula,
        codigoAnoLectivo: anoLectivoAtivo,
      }),
    ];

    if (codigoCursoAnterior !== null) {
      gradesCursoQueries.push(
        this.findGradeCurso({
          codigoCurso: codigoCursoAnterior,
          codigoMatricula: matricula.codigo_matricula,
          codigoAnoLectivo: anoLectivoAtivo,
        }),
      );
    }

    const gradesPorCurso = await Promise.all(gradesCursoQueries);

    // Juntar os resultados dos dois planos (actual + anterior se existir)
    const todasGradesCurso = gradesPorCurso.flat();

    const gradesCursoSemDuplicidade =
      this.deduplicateGradesCurso(todasGradesCurso);

    const gradesCursoIncluindoExcendentes =
      this.mergeGradesPreservandoMaiorNota(
        gradesCursoSemDuplicidade,
        gradesAluno,
      );

    return {
      grades: gradesCursoIncluindoExcendentes.sort(
        (a, b) => a.codigo_classe - b.codigo_classe,
      ),
      totalGradesCurso: gradesCursoIncluindoExcendentes.length,
      totalGrasesAluno: gradesAluno.length,
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

  /**
   * NOTA (tronco comum): o filtro por curso é feito por pgc.CODIGO_CURSO
   * (curso do PLANO CURRICULAR onde a grade foi associada), e não por
   * g.CODIGO_CURSO (curso "dono" original da grade curricular). Isto
   * permite que disciplinas de tronco comum, adicionadas a este curso
   * via adicionarUcDoDepartamentoParaPlanoCurso, apareçam aqui mesmo
   * sendo originárias de outro departamento/curso.
   *
   * NOTA (classe/semestre por plano): a classe e o semestre usados vêm
   * de FK2_TB_PLANO_CURRICULAR_GRADE_SEMESTRE (pgs) quando existir
   * registo — que é a tabela que grava a classe/semestre específicos
   * desta disciplina DENTRO DESTE plano de curso (é o que
   * adicionarUcDoDepartamentoParaPlanoCurso grava). Como só as
   * disciplinas de tronco comum têm registo em pgs, usamos
   * COALESCE(pgs.*, g.*): disciplinas nativas continuam a usar a
   * classe/semestre da própria grade (g.*), e as de tronco comum usam
   * a classe/semestre atribuídos a este plano (pgs.*).
   */
  private async findGradeCurso(
    params: FindGradeCursoDTO,
  ): Promise<FindGradeCursoReturnDTO[]> {
    const { codigoCurso, codigoMatricula, codigoAnoLectivo } = params;

    const sql = `
      WITH grade_base AS (
        SELECT
          g.CODIGO,
          g.CODIGO_DISCIPLINA,
          s.DESIGNACAO   AS SEMESTRE,
          d.DESIGNACAO   AS DISCIPLINA,
          dur.DESIGNACAO AS DURACAO,
          COALESCE(pgs.CODIGO_CLASSE, g.CODIGO_CLASSE) AS CODIGO_CLASSE,
          cl.DESIGNACAO  AS CLASSE
        FROM FK2_TB_GRADE_CURRICULAR g
        INNER JOIN FK2_TB_PLANO_CURRICULAR_GRADE pg
          ON pg.CODIGO_GRADE_CURRICULAR = g.CODIGO
        INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO pgc
          ON pgc.CODIGO = pg.CODIGO_PLANO_CURRICULAR_CURSO
        LEFT JOIN FK2_TB_PLANO_CURRICULAR_GRADE_SEMESTRE pgs
          ON pgs.CODIGO_PLANO_CURRICULAR_CURSO = pgc.CODIGO
          AND pgs.CODIGO_GRADE_CURRICULAR      = g.CODIGO
        INNER JOIN FK2_TB_DISCIPLINAS d
          ON d.CODIGO = g.CODIGO_DISCIPLINA
        INNER JOIN FK2_TB_CLASSES cl
          ON cl.CODIGO = COALESCE(pgs.CODIGO_CLASSE, g.CODIGO_CLASSE)
        INNER JOIN FK2_TB_SEMESTRES s
          ON s.CODIGO = COALESCE(pgs.CODIGO_SEMESTRE, g.CODIGO_SEMESTRE)
        INNER JOIN FK2_TB_DURACAO dur
          ON dur.CODIGO = d.DURACAO
        WHERE pgc.CODIGO_CURSO = :codigoCurso
          AND g.STATUS_        = 1
          AND d.STATUS_        = 1
          AND pgc.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
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
      codigoAnoLectivo,
    } as any);

    if (!result?.length) return [];

    return toLowerCaseKeys(result);
  }

  private async findGradesAprovadasAluno(
    codigoMatricula: number,
  ): Promise<FindGradeAlunoAprovadoReturnDTO[]> {
    const sql = `
      SELECT
        ga.CODIGO             AS CODIGO,
        al.NOTA               AS NOTA,
        ga.CODIGO_DISCIPLINA  AS CODIGO_DISCIPLINA,
        d.DESIGNACAO          AS DISCIPLINA,
        ga.CODIGO_CLASSE      AS CODIGO_CLASSE,
        cl.DESIGNACAO         AS CLASSE,
        dur.DESIGNACAO        AS DURACAO,
        s.DESIGNACAO          AS SEMESTRE,
        al.CODIGO             AS CODIGO_GRADE_ALUNO
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
      WHERE al.CODIGO_MATRICULA = :codigoMatricula
        AND al.NOTA >= 10
        AND al.CODIGO_STATUS_GRADE_CURRICULAR NOT IN (5, 4)
      ORDER BY ga.CODIGO_CLASSE
    `;

    const result = await this.dataSource.query(sql, {
      codigoMatricula,
    } as any);

    if (!result || result.length === 0) return [];

    return toLowerCaseKeys(result);
  }

  private mergeGradesPreservandoMaiorNota(
    gradesCurso: FindGradeCursoReturnDTO[],
    disciplinasExcedentes: FindGradeAlunoAprovadoReturnDTO[],
  ): FindGradeCursoReturnDTO[] {
    const map = new Map<string, FindGradeCursoReturnDTO>();

    for (const g of gradesCurso) {
      map.set(g.disciplina?.trim().toUpperCase(), g);
    }

    for (const excedente of disciplinasExcedentes) {
      const key = excedente.disciplina?.trim().toUpperCase();
      const existing = map.get(key);

      if (!existing) {
        map.set(key, excedente as unknown as FindGradeCursoReturnDTO);
        continue;
      }

      const notaExistente = existing.nota ?? -1;
      const notaExcedente = excedente.nota ?? -1;

      if (notaExcedente > notaExistente) {
        map.set(key, excedente as unknown as FindGradeCursoReturnDTO);
      }
    }

    return Array.from(map.values());
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
