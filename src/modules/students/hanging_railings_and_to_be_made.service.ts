import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindPlanPorClasseDTO } from './dto/FindPlanPorClasseDTO';
import { GetGradePosGraduacaoDto } from './dto/get-grade-pos-graduacao';
import { FindGradeAlunoAprovadoReturnDTO } from './students-result-plan.service';

export interface FindGradeCursoDTO {
  codigoMatricula: number;
  codigoCurso: number;
  codigoAnoLectivo: number;
  codigoSemestre: number;
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
  existe_no_plano_atual: boolean;
}
export interface FindGradeCursoReturnPosDTO {
  codigo: number;
  semestre: string;
  disciplina: string;
  duracao: string;

  codigo_disciplina: number;
}

export interface FindMatriculaDetails {
  codigo_matricula: number | null;
  estado: string | null;
  nome_completo: string;
  bi: string;
  curso: string;
  codigo_curso: number;
  candidatura: string;
}

@Injectable()
export class HangingRailingsAndToBeMadeService {
  constructor(private readonly dataSource: DataSource) {}

  async getNextClass(
    matricula: number,
    anoLectivo?: number,
  ): Promise<{
    proxima_classe: number;
    isEspecializacao: boolean;
    duracao: string;
  }> {
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
    console.log('getNextClass result:', result);
    if (!result || result.length === 0) {
      throw new BadRequestException(`Matrícula ${matricula} não encontrada`);
    }

    const classeAtual = result[0].CLASSE_CODIGO;
    const duracao = result[0].DURACAO;
    const isEspecialidade = result[0].IS_ESPECIALIDADE === 1;

    if (classeAtual === null || classeAtual === undefined) {
      return {
        proxima_classe: 1,
        isEspecializacao: isEspecialidade,
        duracao: duracao,
      };
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
        `Matrícula ${matricula} já atingiu a classe máxima (${duracao})`,
      );
    }
    if (classeAtual === duracao) {
      return {
        proxima_classe: classeAtual,
        isEspecializacao: isEspecialidade,
        duracao: duracao,
      };
    }

    return {
      proxima_classe: classeAtual + 1,
      isEspecializacao: isEspecialidade,
      duracao: duracao,
    };
  }

  /**
   * Retorna:
   * - gradesPendentes: disciplinas de classes INFERIORES à classe informada
   *   que o aluno ainda NÃO tem nota lançada (pendentes)
   * - gradesAFazer: disciplinas da classe IGUAL à informada que o aluno
   *   ainda NÃO concluiu (nota null ou < 10)
   *
   * IMPORTANTE: tanto as pendentes quanto as a fazer são resolvidas contra o
   * plano curricular do ANO LECTIVO informado (codigoAnoLectivo). Isto é
   * proposital: se o aluno deixou uma disciplina em anos anteriores, ele
   * precisa se reinscrever apontando para a grade curricular vinculada ao
   * plano ATUAL do curso (não à grade do plano antigo em que ele cursou).
   *
   * ALUNO NOVO (params.alunoNovo = true):
   * - não existe matrícula ainda, então a busca das cadeiras é feita a
   *   partir do CODIGO_PRE_INSCRICAO (params.codigoPreInscricao), não da
   *   matrícula;
   * - a classe é sempre fixada em 1;
   * - não há gradesPendentes (aluno novo não tem histórico).
   */
  async findHangingRailingsAndToBeMade(params: FindPlanPorClasseDTO) {
    const { alunoNovo } = params;

    if (alunoNovo) {
      return this.findParaAlunoNovo(params);
    }

    return this.findParaAlunoAntigo(params);
  }

  private async findParaAlunoNovo(params: FindPlanPorClasseDTO) {
    const { codigoPreInscricao, codigoAnoLectivo } = params;

    if (!codigoPreInscricao) {
      throw new BadRequestException(
        `codigoPreInscricao é obrigatório para aluno novo`,
      );
    }

    const preInscricao = await this.getPreInscricaoDetails(codigoPreInscricao);

    const gradesCurso = await this.findGradeCursoNovo(
      preInscricao.codigo_curso,
      codigoAnoLectivo!,
    );

    const gradesAFazer = [...gradesCurso].sort(
      (a, b) => a.codigo_disciplina - b.codigo_disciplina,
    );

    return {
      matricula: preInscricao,
      gradesPendentes: [],
      totalGradesPendentes: 0,
      gradesAFazer,
      totalGradesAFazer: gradesAFazer.length,
      isEspecializacao: false,
      message: 'Plano curricular do aluno novo carregado com sucesso',
    };
  }
  async possuiConfirmacao(
    codigoMatricula: number,
    codigoAnoLectivo: number,
    codigoSemestre: number,
  ): Promise<boolean> {
    const sql = `
    SELECT CODIGO
    FROM FK2_TB_CONFIRMACOES
    WHERE CODIGO_MATRICULA   = :codigoMatricula
      AND CODIGO_ANO_LECTIVO = :codigoAnoLectivo
      AND SEMESTRE           = :codigoSemestre
    FETCH FIRST 1 ROW ONLY
  `;

    const result = await this.dataSource.query(sql, {
      codigoMatricula,
      codigoAnoLectivo,
      codigoSemestre,
    } as any);

    return !!result?.length;
  }

  private async findParaAlunoAntigo(params: FindPlanPorClasseDTO) {
    const { codigoMatricula, codigoAnoLectivo, codigoSemestre } = params;
    const possuiConfirmacaoAnoLectivo = await this.possuiConfirmacao(
      codigoMatricula!,
      codigoAnoLectivo,
      codigoSemestre!,
    );
    if (possuiConfirmacaoAnoLectivo) {
      return {
        codigoMatricula,
        gradesPendentes: [],
        totalGradesPendentes: 0,
        gradesAFazer: [],
        totalGradesAFazer: 0,
        isEspecializacao: false,
        message: 'Aluno já possui confirmação para este ano lectivo/semestre',
      };
    }
    if (!codigoMatricula) {
      throw new BadRequestException(
        `codigoMatricula é obrigatório para aluno antigo`,
      );
    }

    if (!codigoSemestre) {
      throw new BadRequestException(
        `codigoSemestre é obrigatório para aluno antigo`,
      );
    }

    const proximaClasse = await this.getNextClass(codigoMatricula);
    if (proximaClasse.proxima_classe <= 1) {
      throw new BadRequestException(`Erro ao calcular a próxima classe`);
    }

    const matricula = await this.getMatriculaDetails(codigoMatricula);

    const codigoCursoAnterior = await this.findCursoAnteriorEspecialidade(
      matricula.codigo_curso,
    );

    const gradesCursoQueries: Promise<FindGradeCursoReturnDTO[]>[] = [
      this.findGradeCurso({
        codigoCurso: matricula.codigo_curso,
        codigoMatricula: matricula.codigo_matricula!,
        codigoAnoLectivo: codigoAnoLectivo!,
        codigoSemestre: codigoSemestre!,
      }),
    ];

    if (codigoCursoAnterior !== null) {
      gradesCursoQueries.push(
        this.findGradeCurso({
          codigoCurso: codigoCursoAnterior,
          codigoMatricula: matricula.codigo_matricula!,
          codigoAnoLectivo: codigoAnoLectivo!,
          codigoSemestre: codigoSemestre!,
        }),
      );
    }

    const gradesPorCurso = await Promise.all(gradesCursoQueries);
    const todasGradesCurso = gradesPorCurso.flat();

    const gradesSemDuplicidade = this.deduplicateGradesCurso(todasGradesCurso);

    const gradesAluno = await this.findGradesAprovadasAluno(codigoMatricula!);

    const gradesCursoIncluindoExcendentes =
      this.mergeGradesPreservandoMaiorNota(gradesSemDuplicidade, gradesAluno);

    const gradesPendentes = gradesCursoIncluindoExcendentes
      .filter(
        (g) =>
          g.codigo_classe < proximaClasse.proxima_classe &&
          (g.nota === null || g.nota === undefined),
      )
      .sort((a, b) => a.codigo_classe - b.codigo_classe);

    const gradesAFazer = gradesCursoIncluindoExcendentes
      .filter(
        (g) =>
          g.codigo_classe >= proximaClasse.proxima_classe &&
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
      message: 'Plano curricular do aluno antigo carregado com sucesso',
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
   * ATENÇÃO: assumi que FK2_TB_PREINSCRICAO tem a coluna CODIGO_CURSO
   * (curso escolhido no ato da pré-inscrição). Se o curso do aluno novo
   * vier de outra tabela (ex: FK2_TB_ADMISSAO ou uma tabela de
   * candidatura), ajusta este JOIN/coluna.
   */
  private async getPreInscricaoDetails(
    codigoPreInscricao: number,
  ): Promise<FindMatriculaDetails> {
    const sql = `
      SELECT
        p.NOME_COMPLETO        AS nome_completo,
        p.BILHETE_IDENTIDADE   AS bi,
        c.designacao           AS curso,
        c.codigo               AS codigo_curso,
        ca.DESIGNACAO          AS candidatura
      FROM FK2_TB_PREINSCRICAO p
      INNER JOIN FK2_TB_CURSOS c
        ON c.codigo = p.CURSO_CANDIDATURA
      INNER JOIN FK2_TB_TIPO_CANDIDATURA ca
        ON ca.ID = c.TIPO_CANDIDATURA
      WHERE p.codigo = :codigoPreInscricao
    `;

    const result = await this.dataSource.query(sql, {
      codigoPreInscricao,
    } as any);

    if (!result || result.length === 0) {
      throw new NotFoundException('Pré-inscrição não encontrada');
    }

    const row = toLowerCaseKeys(result[0]);

    return {
      codigo_matricula: null,
      estado: null,
      nome_completo: row.nome_completo,
      bi: row.bi,
      curso: row.curso,
      codigo_curso: row.codigo_curso,
      candidatura: row.candidatura,
    };
  }

  /**
   * NOTA (tronco comum): o filtro por curso é feito por
   * pgc.CODIGO_CURSO (curso do PLANO CURRICULAR onde a grade foi
   * associada), e não por g.CODIGO_CURSO (curso "dono" original da
   * grade curricular). Isto é o que permite que disciplinas de tronco
   * comum, adicionadas a este curso via
   * adicionarUcDoDepartamentoParaPlanoCurso, apareçam aqui mesmo sendo
   * originárias de outro departamento/curso.
   *
   * NOTA (classe/semestre por plano): a classe e o semestre usados NÃO
   * são lidos diretamente de g.CODIGO_CLASSE/g.CODIGO_SEMESTRE, mas sim
   * de FK2_TB_PLANO_CURRICULAR_GRADE_SEMESTRE (pgs), que é a tabela que
   * regista a classe/semestre específicos desta disciplina DENTRO DESTE
   * plano de curso (é o que adicionarUcDoDepartamentoParaPlanoCurso
   * grava). Isto é necessário porque uma UC de tronco comum pode estar
   * na classe/semestre X no curso de origem, mas ter sido adicionada
   * na classe/semestre Y a este curso — e é o Y que deve valer aqui.
   * Fazemos COALESCE(pgs.*, g.*) para não quebrar disciplinas nativas
   * que porventura não tenham registo em pgs.
   */
  private async findGradeCurso(
    params: FindGradeCursoDTO,
  ): Promise<FindGradeCursoReturnDTO[]> {
    const { codigoCurso, codigoMatricula, codigoAnoLectivo, codigoSemestre } =
      params;

    const sql = `
      WITH grade_base AS (
        -- Histórico: todas as grades já vinculadas a QUALQUER plano deste
        -- curso (independente do ano lectivo), incluindo disciplinas de
        -- tronco comum vinculadas via plano curricular (pgc.CODIGO_CURSO).
        -- É aqui que descobrimos o que o aluno deixou/tem pendente, com a
        -- classe/semestre em que a disciplina fica DENTRO DESTE PLANO
        -- (via pgs, com fallback para a classe/semestre original da
        -- grade caso não haja registo em pgs).
        -- Filtrado pelo semestre informado (aluno antigo sempre indica o
        -- semestre que quer consultar).
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
        WHERE pgc.CODIGO_CURSO  = :codigoCurso
          AND g.STATUS_         = 1
          AND d.STATUS_         = 1
          AND COALESCE(pgs.CODIGO_SEMESTRE, g.CODIGO_SEMESTRE) = :codigoSemestre
      ),
      grade_atual AS (
        -- Mapeamento disciplina -> CODIGO da grade curricular no plano do
        -- ANO LECTIVO informado por parâmetro (também via pgc.CODIGO_CURSO,
        -- para incluir tronco comum). Usado para "apontar" a disciplina
        -- pendente para a grade correta na hora de reinscrever.
        SELECT
          g.CODIGO,
          g.CODIGO_DISCIPLINA
        FROM FK2_TB_GRADE_CURRICULAR g
        INNER JOIN FK2_TB_PLANO_CURRICULAR_GRADE pg
          ON pg.CODIGO_GRADE_CURRICULAR = g.CODIGO
        INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO pgc
          ON pgc.CODIGO = pg.CODIGO_PLANO_CURRICULAR_CURSO
        WHERE pgc.CODIGO_CURSO       = :codigoCurso
          AND g.STATUS_              = 1
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
        COALESCE(gat.CODIGO, gb.CODIGO) AS CODIGO,
        gb.SEMESTRE,
        gb.DISCIPLINA,
        gb.DURACAO,
        ab.NOTA,
        gb.CODIGO_DISCIPLINA,
        gb.CODIGO_CLASSE,
        gb.CLASSE,
        ab.CODIGO_GRADE_ALUNO,
        CASE WHEN gat.CODIGO IS NULL THEN 0 ELSE 1 END AS EXISTE_NO_PLANO_ATUAL
      FROM grade_base gb
      LEFT JOIN grade_atual gat
        ON gat.CODIGO_DISCIPLINA = gb.CODIGO_DISCIPLINA
      LEFT JOIN aluno_base ab
        ON ab.CODIGO_GRADE_CURRICULAR = gb.CODIGO
        OR ab.CODIGO_DISCIPLINA       = gb.CODIGO_DISCIPLINA
      ORDER BY gb.CODIGO_CLASSE ASC
    `;

    const result = await this.dataSource.query(sql, {
      codigoMatricula,
      codigoCurso,
      codigoAnoLectivo,
      codigoSemestre,
    } as any);

    if (!result?.length) return [];

    const rows = toLowerCaseKeys(result) as any[];

    return rows.map((row) => ({
      ...row,
      existe_no_plano_atual: Number(row.existe_no_plano_atual) === 1,
    }));
  }

  /**
   * Busca as disciplinas da classe 1 do plano curricular ATUAL do curso,
   * para aluno novo (sem histórico e sem notas lançadas).
   *
   * NOTA (tronco comum): filtro por pgc.CODIGO_CURSO em vez de
   * g.CODIGO_CURSO, pelo mesmo motivo explicado em findGradeCurso — para
   * incluir disciplinas de tronco comum já associadas ao plano curricular
   * deste curso.
   */
  private async findGradeCursoNovo(
    codigoCurso: number,
    codigoAnoLectivo: number,
  ): Promise<FindGradeCursoReturnDTO[]> {
    const sql = `
      SELECT
        g.CODIGO,
        s.DESIGNACAO   AS SEMESTRE,
        d.DESIGNACAO   AS DISCIPLINA,
        dur.DESIGNACAO AS DURACAO,
        CAST(NULL AS NUMBER)  AS NOTA,
        g.CODIGO_DISCIPLINA,
        COALESCE(pgs.CODIGO_CLASSE, g.CODIGO_CLASSE) AS CODIGO_CLASSE,
        cl.DESIGNACAO  AS CLASSE,
        CAST(NULL AS NUMBER)  AS CODIGO_GRADE_ALUNO,
        1 AS EXISTE_NO_PLANO_ATUAL
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
      WHERE pgc.CODIGO_CURSO  = :codigoCurso
        AND g.STATUS_         = 1
        AND d.STATUS_         = 1
        AND COALESCE(pgs.CODIGO_CLASSE, g.CODIGO_CLASSE) = 1
        AND pgc.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
      ORDER BY g.CODIGO_DISCIPLINA ASC
    `;

    const result = await this.dataSource.query(sql, {
      codigoCurso,
      codigoAnoLectivo,
    } as any);

    if (!result?.length) return [];

    const rows = toLowerCaseKeys(result) as any[];

    return rows.map((row) => ({
      ...row,
      existe_no_plano_atual: Number(row.existe_no_plano_atual) === 1,
    }));
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

  async findHangingRailingsAndToBeMadePos(
    query: GetGradePosGraduacaoDto,
  ): Promise<FindGradeCursoReturnPosDTO[]> {
    const preInscricao = await this.getPreInscricaoDetails(
      query.codigoPreInscricao,
    );
    if (!preInscricao?.codigo_curso) {
      throw new BadRequestException('Curso não encontrado');
    }

    const sql = `
      SELECT
        g.CODIGO,
        s.DESIGNACAO   AS SEMESTRE,
        d.DESIGNACAO   AS DISCIPLINA,
        dur.DESIGNACAO AS DURACAO,
        g.CODIGO_DISCIPLINA
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
      WHERE g.CODIGO_CURSO         = :codigoCurso
        AND g.STATUS_              = 1
        AND d.STATUS_              = 1

        AND pgc.CODIGO_ANO_LECTIVO = :codigoCiclo
      ORDER BY g.CODIGO_DISCIPLINA ASC
    `;

    const result = await this.dataSource.query(sql, {
      codigoCurso: preInscricao.codigo_curso,
      codigoCiclo: query.codigoCiclo,
    } as any);

    if (!result?.length) return [];

    const rows = toLowerCaseKeys(result) as any[];

    return rows.map((row) => ({
      ...row,
      preInscricao,
    }));
  }
}
