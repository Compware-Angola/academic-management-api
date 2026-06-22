import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import oracledb from 'oracledb';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { CreateEquivalenceTFCMigration } from './dto/create-equivalence-tfc-migration';

interface FindGradeCursoDTO {
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
  codigo_grade_aluno: number;
  semestreid: number;
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
  nome_utilizador: string;
  codigo_ano_lectivo: number;
  semestreid: number;
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
interface CreateGradeCurricularAlunoDTO {
  grade: number;
  codigoMatricula: number;
  codigoConfirmacao: number | null;
  estado: number;
  nota: number;
  userId: number;
  statusGrade: number;
  anoLectivo: number;
  epoca: number;
  observacao: string | null;
  codigoUtilizador: number;
  equivalencia: number;
}
@Injectable()
export class EquivalenceTFCMigration {
  constructor(
    private readonly dataSource: DataSource,
    private readonly anoLectivoUtil: AnoLectivoUtil,
  ) {}
  public async findAll(codigoMatricula: number) {
    const [matricula, gradesAluno] = await Promise.all([
      this.getMatriculaDetails(codigoMatricula),
      this.findGradesAprovadasAluno(codigoMatricula),
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

  private async findGradeCurso(params: FindGradeCursoDTO) {
    const { codigoCurso, codigoMatricula } = params;
    const sql = `
        WITH grade_base AS (
          SELECT
            g.CODIGO,
            g.CODIGO_DISCIPLINA,
            s.DESIGNACAO   AS SEMESTRE,
            s.CODIGO       AS SEMESTREID,
            d.DESIGNACAO   AS DISCIPLINA,
            dur.DESIGNACAO AS DURACAO,
            g.CODIGO_CLASSE,
            cl.DESIGNACAO AS CLASSE
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
          WHERE g.CODIGO_CURSO  = :codigoCurso
            AND g.STATUS_       = 1
            AND d.STATUS_       = 1
        ),
        aluno_base AS (
          SELECT
            al.CODIGO_GRADE_CURRICULAR,
            al.CODIGO  CODIGO_ALUNO,
            al.NOTA,
            ga.CODIGO_DISCIPLINA,
            ga.CODIGO_SEMESTRE   AS SEMESTREID,
            u.NOME            NOME_UTILIZADOR,
            al.CODIGO_ANO_LECTIVO
          FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
          INNER JOIN FK2_TB_GRADE_CURRICULAR ga
            ON ga.CODIGO = al.CODIGO_GRADE_CURRICULAR
          LEFT JOIN FK2_MCA_TB_UTILIZADOR u
            ON u.PK_UTILIZADOR = al.CODIGO_UTILIZADOR
          WHERE al.CODIGO_MATRICULA = :codigoMatricula
            AND al.NOTA >= 0
            AND al.CODIGO_STATUS_GRADE_CURRICULAR NOT IN (5)
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
          ab.NOME_UTILIZADOR,
          ab.CODIGO_ALUNO       as codigo_grade_aluno,
          ab.CODIGO_ANO_LECTIVO,
          nvl(ab.SEMESTREID, gb.SEMESTREID) as SEMESTREID
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

    //const gradesAluno = await this.findGradesAprovadasAluno(codigoMatricula);

    return toLowerCaseKeys(result);
  }
  private async findConfirmacoes(
    codigoMatricula: number,
    codigoAnoLectivo: number,
  ) {
    const sqlObterConfirmacoes = `
    SELECT
      codigo,
      semestre
    FROM fk2_tb_confirmacoes
    WHERE codigo_ano_lectivo = :codigoAnoLectivo
      AND codigo_matricula = :codigoMatricula
  `;
    const confirmacoes = await this.dataSource.query(sqlObterConfirmacoes, {
      codigoMatricula,
      codigoAnoLectivo,
    } as any);

    if (!confirmacoes?.length) {
      throw new BadRequestException('Erro ao encontrar confirmações');
    }
    let codigoPrimeiro: number | null = null;
    let codigoSegundo: number | null = null;
    const primeiroSemestre = confirmacoes.find(
      (item) => item.SEMESTRE === 1 || item.SEMESTRE == null,
    );
    let segundoSemestre = confirmacoes.find((item) => item.SEMESTRE === 2);
    segundoSemestre = segundoSemestre ? segundoSemestre : primeiroSemestre;

    codigoSegundo = segundoSemestre.CODIGO;
    codigoPrimeiro = primeiroSemestre.CODIGO;

    return {
      codigoConfirmacaoPrimeiroSemestre: codigoPrimeiro,
      codigoConfirmacaoSegundoSemestre: codigoSegundo,
    };
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
          s.DESIGNACAO                            AS SEMESTRE,
          u.NOME                                  AS NOME_UTILIZADOR,
          al.CODIGO                               AS codigo_grade_aluno,
          al.CODIGO_ANO_LECTIVO                   AS CODIGO_ANO_LECTIVO,
          ga.CODIGO_SEMESTRE                      AS SEMESTREID

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

      LEFT JOIN FK2_MCA_TB_UTILIZADOR u
          ON u.PK_UTILIZADOR = al.CODIGO_UTILIZADOR

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
  public async saveAll(user: number, dto: CreateEquivalenceTFCMigration) {
    const observacao = 'Inscrição durante o processo de Lançamento de Notas!';
    const sqlUpdate = `
    update
    fk2_tb_grade_curricular_aluno
    set canal  = 1,
        codigo_status_grade_curricular = :statusGrade,
        codigo_ano_lectivo = :anoLectivo,
        observacao = :observacao,
        equivalencia = :equivalencia,
        nota = :nota
    where codigo = :codigoAluno
    `;

    const { itens, equivalencia, matriculaId } = dto;
    for (const item of itens) {
      const isEquivalencia = Number(equivalencia === 1);
      const statusGrade = item.nota >= 10 ? 3 : 2;

      if (item.codigoGradeAluno) {
        await this.salvarHistoricoGradeCurricularAluno(item.codigoGradeAluno);
        await this.dataSource.query(sqlUpdate, {
          statusGrade,
          anoLectivo: item.anoLectivo,
          observacao: observacao,
          nota: item.nota,
          equivalencia: isEquivalencia,
          codigoAluno: item.codigoGradeAluno,
        } as any);
      } else {
        const confirmacoes = await this.findConfirmacoes(
          matriculaId!,
          item.anoLectivo,
        );
        const codigoConfirmacao =
          item.semestreId == 1
            ? confirmacoes?.codigoConfirmacaoPrimeiroSemestre
            : confirmacoes?.codigoConfirmacaoSegundoSemestre;

        await this.createGradeCurricularAluno({
          anoLectivo: item.anoLectivo,
          codigoConfirmacao: codigoConfirmacao,
          codigoMatricula: matriculaId!,
          codigoUtilizador: user,
          epoca: 1,
          equivalencia: isEquivalencia,
          estado: 1,
          grade: item.codigoGrade,
          nota: item.nota,
          observacao: observacao,
          statusGrade: statusGrade,
          userId: 1,
        });
      }
    }
  }
  public async delete(codigoGradeAluno: number) {
    await this.dataSource.query(
      `
      update fk2_tb_grade_curricular_aluno
      set codigo_status_grade_curricular = 5
      where codigo = :codigo
    `,
      {
        codigo: codigoGradeAluno,
      } as any,
    );
  }
  private async salvarHistoricoGradeCurricularAluno(
    codigoGradeCurricularAluno: number,
  ) {
    const [grade] = await this.dataSource.query(
      `
      SELECT
        CODIGO,
        CODIGO_GRADE_CURRICULAR,
        TURMA,
        CODIGO_CONFIRMACAO,
        CODIGO_MATRICULA,
        ESTADO,
        NOTA,
        CREATED_AT,
        USER_ID,
        CANAL,
        CODIGO_STATUS_GRADE_CURRICULAR,
        CODIGO_ANO_LECTIVO,
        EPOCA,
        OBSERVACAO,
        UPDATED_AT,
        EQUIVALENCIA
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO
      WHERE CODIGO = :codigoGradeCurricularAluno
    `,
      {
        codigoGradeCurricularAluno,
      } as any,
    );

    if (!grade) {
      throw new NotFoundException(
        `Grade curricular do aluno ${codigoGradeCurricularAluno} não encontrada`,
      );
    }
    const sqlInsert = `
    INSERT INTO FK2_TB_GRADE_CURRICULAR_ALUNO_HISTORICO (
      CODIGO_GRADE_CURRICULAR,
      TURMA,
      CODIGO_CONFIRMACAO,
      CODIGO_MATRICULA,
      ESTADO,
      CREATED_AT,
      USER_ID,
      CANAL,
      CODIGO_STATUS_GRADE_CURRICULAR,
      CODIGO_ANO_LECTIVO,
      EPOCA,
      OBSERVACAO,
      UPDATED_AT,
      EQUIVALENCIA,
      NOTA_ANTERIOR,
      NOTA_ALTERADA,
      MOTIVO_ALTERACAO
    )
    VALUES (
      :codigoGradeCurricular,
      :turma,
      :codigoConfirmacao,
      :codigoMatricula,
      :estado,
      :createdAt,
      :userId,
      :canal,
      :codigoStatusGradeCurricular,
      :codigoAnoLectivo,
      :epoca,
      :observacao,
      :updatedAt,
      :equivalencia,
      :notaAnterior,
      :notaAlterada,
      :motivoAlteracao
    )
  `;

    await this.dataSource.query(sqlInsert, {
      codigoGradeCurricular: grade.CODIGO_GRADE_CURRICULAR,
      turma: grade.TURMA,
      codigoConfirmacao: grade.CODIGO_CONFIRMACAO,
      codigoMatricula: grade.CODIGO_MATRICULA,
      estado: grade.ESTADO,
      createdAt: grade.CREATED_AT,
      userId: grade.USER_ID,
      canal: grade.CANAL,
      codigoStatusGradeCurricular: grade.CODIGO_STATUS_GRADE_CURRICULAR,
      codigoAnoLectivo: grade.CODIGO_ANO_LECTIVO,
      epoca: grade.EPOCA,
      observacao: grade.OBSERVACAO,
      updatedAt: grade.UPDATED_AT,
      equivalencia: grade.EQUIVALENCIA,
      notaAnterior: null,
      notaAlterada: null,
      motivoAlteracao: `Inscrição durante o processo de Lançamento de Notas! Código Grade Curricular Aluno: ${grade.CODIGO}`,
    } as any);
  }
  private async createGradeCurricularAluno(
    item: CreateGradeCurricularAlunoDTO,
  ) {
    const sqlCreate = `
  INSERT INTO fk2_tb_grade_curricular_aluno (
    codigo_grade_curricular,
    codigo_matricula,
    codigo_confirmacao,
    estado,
    nota,
    created_at,
    user_id,
    canal,
    codigo_status_grade_curricular,
    codigo_ano_lectivo,
    epoca,
    observacao,
    codigo_utilizador,
    updated_at,
    equivalencia
  )
  VALUES (
    :grade,
    :codigoMatricula,
    :codigoConfirmacao,
    :estado,
    :nota,
    CURRENT_DATE,
    :userId,
    :canal,
    :statusGrade,
    :anoLectivo,
    :epoca,
    :observacao,
    :codigoUtilizador,
    CURRENT_DATE,
    :equivalencia
  )
`;

    await this.dataSource.query(sqlCreate, {
      grade: item.grade,
      codigoMatricula: item.codigoMatricula,
      codigoConfirmacao: item.codigoConfirmacao,
      estado: item.estado,
      nota: item.nota,
      userId: item.userId,
      canal: 1,
      statusGrade: item.statusGrade,
      anoLectivo: item.anoLectivo,
      epoca: item.epoca,
      observacao: item.observacao,
      codigoUtilizador: item.codigoUtilizador,
      equivalencia: item.equivalencia,
    } as any);
  }
}
