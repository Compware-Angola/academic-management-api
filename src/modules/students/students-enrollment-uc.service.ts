import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { CreateStudentEnrollmentUC } from './dto/create-student-enrollment-uc';
import { STATUS_GRADE } from '../../common/enums/status.grade';
import oracledb from 'oracledb';

interface CriarConfirmacoesDTO {
  codigoConfirmacaoPrimeiroSemestre: number | null;
  codigoConfirmacaoSegundoSemestre: number | null;
}

interface EnrollmentResult {
  codigoGrade: number;
  success: boolean;
  error?: string;
}

interface GradeSemestreDTO {
  codigoSemestre: number | null;
  codigoCurso: number | null;
}

@Injectable()
export class StudentsEnrollmentUCService {
  constructor(private readonly dataSource: DataSource) {}

  private queryRunner: QueryRunner;

  // ─────────────────────────────────────────────
  // ENTRY POINT
  // ─────────────────────────────────────────────

  async enrollmentUc(dto: CreateStudentEnrollmentUC) {
    this.queryRunner = this.dataSource.createQueryRunner();
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction();

    try {
      const results = await this.processarInscricoes(dto);

      const sucessos = results
        .filter((r) => r.success)
        .map((r) => r.codigoGrade);

      const erros = results
        .filter((r) => !r.success)
        .map((r) => ({ codigoGrade: r.codigoGrade, error: r.error }));

      // Commit se pelo menos uma inscrição foi bem-sucedida
      if (sucessos.length > 0) {
        await this.queryRunner.commitTransaction();
        await this.atualizarClasseConfirmacao(
          dto.codigoMatricula,
          dto.codigoAnoLectivo,
        );
      } else {
        await this.queryRunner.rollbackTransaction();
      }

      return {
        total: dto.codigoGrades.length,
        sucessos,
        erros,
      };
    } catch (err) {
      await this.queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await this.queryRunner.release();
    }
  }

  // ─────────────────────────────────────────────
  // ORQUESTRAÇÃO
  // ─────────────────────────────────────────────

  private async processarInscricoes(
    dto: CreateStudentEnrollmentUC,
  ): Promise<EnrollmentResult[]> {
    const {
      codigoAnoLectivo,
      codigoGrades,
      codigoMatricula,
      epoca,
      observacao,
    } = dto;

    const confirmacoes = await this.criarConfirmacoes(
      codigoMatricula,
      codigoAnoLectivo,
    );

    const results = await Promise.all(
      codigoGrades.map((codigoGrade) =>
        this.inscreverGrade({
          codigoGrade,
          codigoMatricula,
          codigoAnoLectivo,
          epoca,
          observacao,
          confirmacoes,
        }),
      ),
    );

    return results;
  }

  private async inscreverGrade(params: {
    codigoGrade: number;
    codigoMatricula: number;
    codigoAnoLectivo: number;
    epoca: number;
    observacao: string;
    confirmacoes: CriarConfirmacoesDTO;
  }): Promise<EnrollmentResult> {
    const {
      codigoGrade,
      codigoMatricula,
      codigoAnoLectivo,
      epoca,
      observacao,
      confirmacoes,
    } = params;

    try {
      await this.validarGradeNaoMatriculada(
        codigoGrade,
        codigoMatricula,
        codigoAnoLectivo,
      );

      const { codigoSemestre } = await this.buscarSemestreGrade(codigoGrade);

      const codigoConfirmacao =
        codigoSemestre === 2
          ? confirmacoes.codigoConfirmacaoSegundoSemestre
          : confirmacoes.codigoConfirmacaoPrimeiroSemestre;

      await this.inserirGradeCurricularAluno({
        codigoGrade,
        codigoConfirmacao,
        codigoMatricula,
        codigoAnoLectivo,
        epoca,
        observacao,
      });

      return { codigoGrade, success: true };
    } catch (e: any) {
      return { codigoGrade, success: false, error: e?.message };
    }
  }

  // ─────────────────────────────────────────────
  // VALIDAÇÕES
  // ─────────────────────────────────────────────

  private async validarGradeNaoMatriculada(
    codigoGrade: number,
    codigoMatricula: number,
    codigoAnoLectivo: number,
  ): Promise<void> {
    const disciplinaAtual = await this.queryRunner.query(
      `
    SELECT dis.CODIGO AS CODIGO_DISCIPLINA, dis.DESIGNACAO AS NOME_DISCIPLINA
    FROM FK2_TB_GRADE_CURRICULAR gc
    INNER JOIN FK2_TB_DISCIPLINAS dis
      ON dis.CODIGO = gc.CODIGO_DISCIPLINA
    WHERE gc.CODIGO = :codigoGrade
    `,
      { codigoGrade } as any,
    );

    if (!disciplinaAtual || disciplinaAtual.length === 0) {
      throw new BadRequestException('A grade selecionada não existe');
    }

    const { CODIGO_DISCIPLINA, NOME_DISCIPLINA } = disciplinaAtual[0];

    const sql = `
    SELECT al.CODIGO
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
    INNER JOIN FK2_TB_GRADE_CURRICULAR gc
      ON al.CODIGO_GRADE_CURRICULAR = gc.CODIGO
    INNER JOIN FK2_TB_DISCIPLINAS dis
      ON gc.CODIGO_DISCIPLINA = dis.CODIGO
    WHERE 1=1
      AND al.CODIGO_STATUS_GRADE_CURRICULAR IN (2,3)
      AND al.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
      AND al.CODIGO_MATRICULA = :codigoMatricula
      AND (
        dis.CODIGO = :codigoDisc
        OR UPPER(TRIM(dis.DESIGNACAO)) = UPPER(:nomeDisc)
      )
  `;

    const result = await this.queryRunner.query(sql, {
      codigoAnoLectivo,
      codigoMatricula,
      codigoDisc: CODIGO_DISCIPLINA,
      nomeDisc: NOME_DISCIPLINA,
    } as any);

    if (result.length > 0) {
      throw new BadRequestException('A grade selecionada já está matriculada');
    }
  }

  // ─────────────────────────────────────────────
  // QUERIES / READS
  // ─────────────────────────────────────────────

  private async buscarSemestreGrade(
    codigoGrade: number,
  ): Promise<GradeSemestreDTO> {
    const sql = `
      SELECT CODIGO_SEMESTRE, CODIGO_CURSO
      FROM FK2_TB_GRADE_CURRICULAR
      WHERE CODIGO = :codigoGrade
    `;

    const result = await this.queryRunner.query(sql, {
      codigoGrade,
    } as any);

    return {
      codigoSemestre: result?.[0]?.CODIGO_SEMESTRE ?? null,
      codigoCurso: result?.[0]?.CODIGO_CURSO ?? null,
    };
  }
  //ATÉ QUANDO ESSE SOFRIMENTO
  private async buscarConfirmacoesExistentes(
    codigoMatricula: number,
    codigoAnoLectivo: number,
  ) {
    const sql = `
      SELECT
        codigo,
        semestre
      FROM fk2_tb_confirmacoes
      WHERE codigo_ano_lectivo = :codigoAnoLectivo
      --  AND estado = 1
        AND codigo_matricula = :codigoMatricula
        
    `;

    return this.queryRunner.query(sql, {
      codigoMatricula,
      codigoAnoLectivo,
    } as any);
  }

  // ─────────────────────────────────────────────
  // INSCREVER
  // ─────────────────────────────────────────────
  //AQUI SÓ REZAR PARA TUDA DAR CERTO MEU DEUS
  private async inserirGradeCurricularAluno(params: {
    codigoGrade: number;
    codigoConfirmacao: number | null;
    codigoMatricula: number;
    codigoAnoLectivo: number;
    epoca: number;
    observacao: string;
  }): Promise<void> {
    const {
      codigoGrade,
      codigoConfirmacao,
      codigoMatricula,
      codigoAnoLectivo,
      epoca,
      observacao,
    } = params;

    const sql = `
      INSERT INTO FK2_TB_GRADE_CURRICULAR_ALUNO (
        CODIGO_GRADE_CURRICULAR,
        CODIGO_CONFIRMACAO,
        CODIGO_MATRICULA,
        ESTADO,
        CREATED_AT,
        CANAL,
        CODIGO_STATUS_GRADE_CURRICULAR,
        CODIGO_ANO_LECTIVO,
        EPOCA,
        OBSERVACAO,
        CODIGO_UTILIZADOR,
        REF_UTILIZADOR,
        NOTA
      )
      VALUES (
        :codigo_grade_curricular,
        :codigo_confirmacao,
        :codigo_matricula,
        :estado,
        sysdate,
        :canal,
        :codigo_status_grade_curricular,
        :codigo_ano_lectivo,
        :epoca,
        :observacao,
        :codigo_utilizador,
        :ref_utilizador,
        0
      )
    `;

    await this.queryRunner.query(sql, {
      codigo_grade_curricular: codigoGrade,
      codigo_confirmacao: codigoConfirmacao,
      codigo_matricula: codigoMatricula,
      estado: 1,
      canal: 7,
      codigo_status_grade_curricular: STATUS_GRADE.CURSO,
      codigo_ano_lectivo: codigoAnoLectivo,
      epoca,
      observacao,
      codigo_utilizador: null,
      ref_utilizador: null,
    } as any);
  }

  private async inserirConfirmacao(
    codigoMatricula: number,
    codigoAnoLectivo: number,
    semestre: number,
  ): Promise<number> {
    const sql = `
      INSERT INTO fk2_tb_confirmacoes (
        codigo_matricula,
        data_confirmacao,
        codigo_ano_lectivo,
        estado,
        classe,
        canal,
        cadeirante,
        semestre
      ) VALUES (
        :codigoMatricula,
        SYSDATE,
        :codigoAnoLectivo,
        1,
        1,
        1,
        'NÃO',
        :semestre
      )
      RETURNING CODIGO INTO :codigoGerado
    `;

    const result = await this.queryRunner.query(sql, {
      codigoMatricula,
      codigoAnoLectivo,
      semestre,
      codigoGerado: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    } as any);

    return result.codigoGerado[0];
  }

  private async atualizarClasseConfirmacao(
    codigoMatricula: number,
    codigoAnoLectivo: number,
  ): Promise<void> {
    const codigoClasse = await this.obterClasse(
      codigoMatricula,
      codigoAnoLectivo,
    );
    const sql = `
      update fk2_tb_confirmacoes
      set  classe = :classe
      where codigo_matricula = :codigoMatricula and codigo_ano_lectivo = :codigoAnoLectivo
    `;
    await this.dataSource.query(sql, {
      classe: codigoClasse,
      codigoMatricula: codigoMatricula,
      codigoAnoLectivo: codigoAnoLectivo,
    } as any);
  }

  // ─────────────────────────────────────────────
  // CONFIRMAÇÕES
  // ─────────────────────────────────────────────

  private async criarConfirmacoes(
    codigoMatricula: number,
    codigoAnoLectivo: number,
  ): Promise<CriarConfirmacoesDTO> {
    const confirmacoes = await this.buscarConfirmacoesExistentes(
      codigoMatricula,
      codigoAnoLectivo,
    );

    const codigoPrimeiro = await this.resolverConfirmacaoPorSemestre(
      confirmacoes,
      1,
      codigoMatricula,
      codigoAnoLectivo,
      (item) => item.SEMESTRE === 1 || item.SEMESTRE == null,
    );

    const codigoSegundo = await this.resolverConfirmacaoPorSemestre(
      confirmacoes,
      2,
      codigoMatricula,
      codigoAnoLectivo,
      (item) => item.SEMESTRE === 2,
    );

    return {
      codigoConfirmacaoPrimeiroSemestre: codigoPrimeiro,
      codigoConfirmacaoSegundoSemestre: codigoSegundo,
    };
  }

  private async resolverConfirmacaoPorSemestre(
    confirmacoes: any[],
    semestre: number,
    codigoMatricula: number,
    codigoAnoLectivo: number,
    predicate: (item: any) => boolean,
  ): Promise<number | null> {
    const confirmacaoExistente = confirmacoes.find(predicate);
    if (confirmacaoExistente) {
      return confirmacaoExistente.CODIGO as number;
    }
    return this.inserirConfirmacao(codigoMatricula, codigoAnoLectivo, semestre);
  }

  private async obterClasse(matricula: number, anoLectivo: number) {
    const query = `
        SELECT cl.codigo as CLASSE_CODIGO
            FROM FK2_TB_GRADE_CURRICULAR_ALUNO ftgca
            LEFT JOIN FK2_TB_GRADE_CURRICULAR ftgc
                ON ftgc.CODIGO = ftgca.CODIGO_GRADE_CURRICULAR
            LEFT JOIN FK2_TB_CLASSES cl
                ON cl.CODIGO = ftgc.CODIGO_CLASSE
            WHERE ftgca.CODIGO_MATRICULA = :matricula
              AND ftgca.CODIGO_STATUS_GRADE_CURRICULAR IN (2, 3)
              AND ftgca.CODIGO_ANO_LECTIVO = :anoLectivo
            GROUP BY cl.CODIGO, cl.DESIGNACAO
            ORDER BY COUNT(ftgca.CODIGO) DESC
            FETCH FIRST 1 ROWS ONLY
    `;

    const result = await this.dataSource.query(query, {
      matricula,
      anoLectivo,
    } as any);
    console.log('Result =>', result);

    const classeAtual = result?.[0]?.CLASSE_CODIGO;

    if (classeAtual === null || classeAtual === undefined) {
      return 1;
    }

    return classeAtual;
  }
}
