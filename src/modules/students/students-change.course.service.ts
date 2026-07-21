import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { STATUS_GRADE } from '../../common/enums/status.grade';
import { ChangeCourseDTO } from './dto/change-course.dto';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { SERVICE_SIGLA } from '../../common/enums/service.sigla';
import oracledb from 'oracledb';
interface RegistrarMotivoParams {
  codigoMatricula: number;
  cursoAnterior: number;
  cursoSelecionado: number;
  motivo: string;
  codigoUtilizador: number;
}
interface BuscarGradeCurricularEquivalentesParams {
  codigoMatricula: number;
  cursoAnterior: number;
  cursoSelecionado: number;
}
interface GradeCurricularEquivalenteDTO {
  codigo_disciplina: number;
  disciplina: string;
  codigo_grade: number;
  nota: number;
  codigo_grade_equivalente: number;
  codigo_grade_curricular_aluno: number;
}

interface GradeCurricularAlunoAnteriorDTO {
  codigo_grade_curricular: number;
  turma: string | null;
  codigo_confirmacao: number | null;
  codigo_matricula: number;
  estado: number;
  nota: number | null;
  created_at: Date | string;
  user_id: number | null;
  canal: string | null;
  codigo_status_grade_curricular: number;
  codigo_ano_lectivo: number;
  epoca: string | null;
  observacao: string | null;
  codigo_utilizador: number | null;
  updated_at: Date | string | null;
  equivalencia: number | null;
  ref_horario: number | null;
  ref_utilizador: number | null;
  codigo: number;
}
interface BuscarhorarioDTO {
  codigoGradeCurricular: number;
  codigoPeriodo: number;
}

interface CriarConfirmacoesDTO {
  codigoConfirmacaoPrimeiroSemestre: number | null;
  codigoConfirmacaoSegundoSemestre: number | null;
}
interface CriarGradeCurricularDTO {
  gradesEquivalentes: GradeCurricularEquivalenteDTO[];
  codigoMatricula: number;
  codigoCurso: number;
  codigoPeriodo: number;
  codigoConfirmacaoPrimeiroSemestre: number;
  codigoConfirmacaoSegundoSemestre: number;
  codigoAnoLectivo: number;
  userId: number;
}
interface BuscarNovasGradeCurricularPrimeiroAnoReturnDTO {
  codigo_disciplina: number;
  codigo_classe: number;
  codigo_semestre: number;
  disciplina: string;
  codigo: number;
}
interface InscreverGradesAutomaticamenteDTO {
  codigoMatricula: number;
  codigoAnoLectivo: number;
  codigoCurso: number;
  codigoPeriodo: number;
  userId: number;
  gradesEquivalentes: GradeCurricularEquivalenteDTO[];
}
@Injectable()
export class StudentsChangeCourse {
  constructor(
    private readonly dataSource: DataSource,
    private readonly anoLectivoUtil: AnoLectivoUtil,
  ) {}
  private queryRunner: QueryRunner;

  private async getNomeUser(userId: number): Promise<string> {
    const result = await this.dataSource.query(
      `select NOME from FK2_MCA_TB_UTILIZADOR where PK_UTILIZADOR = :userId`,
      [userId],
    );

    if (!result || result.length === 0) {
      throw new Error(`Usuário não encontrado ${userId}`);
    }

    return result[0].NOME as string;
  }

  private async getMatriculaDetails(codigoMatricula: number) {
    const sql = `
      SELECT
        m.codigo               AS codigo_matricula,
        m.ESTADO_MATRICULA     AS estado,
        p.NOME_COMPLETO        AS nome_completo,
        p.BILHETE_IDENTIDADE   AS bi,
        c.designacao           AS curso,
        c.codigo               AS codigo_curso,
        ca.DESIGNACAO          AS candidatura,
        p.CODIGO_TURNO         AS codigo_periodo

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

    const result = await this.queryRunner.query(sql, {
      codigoMatricula,
    } as any);

    if (!result || result.length === 0) {
      throw new NotFoundException('Matrícula não encontrada');
    }

    return toLowerCaseKeys(result[0]);
  }
  private async confirmationExists(
    codigoMatricula: number,
    anoLectivoId: number,
  ): Promise<boolean> {
    const sql = `
        SELECT *
        FROM FK2_TB_CONFIRMACOES con
        WHERE con.CODIGO_MATRICULA = :codigoMatricula
          AND con.CODIGO_ANO_LECTIVO = :anoLectivoId
      `;

    const result = await this.queryRunner.query(sql, {
      codigoMatricula,
      anoLectivoId,
    } as any);
    return result && result.length > 0;
  }

  async mudarCurso(userId: number, dto: ChangeCourseDTO) {
    this.queryRunner = this.dataSource.createQueryRunner();
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction();
    try {
      const { PoloId, cursoId, matriculaId, motivo } = dto;
      let mudarCurso = false;

      const anoCorrente = await this.anoLectivoUtil.getAnoAtualId();
      if (!anoCorrente) {
        throw new BadRequestException('Ano letivo atual não encontrado');
      }
      if (!matriculaId) {
        throw new BadRequestException('Código da matrícula é obrigatório');
      }
      if (!PoloId && !cursoId) {
        throw new BadRequestException(
          'Polo ou curso deve ser informado para a alteração',
        );
      }

      const matriculaDetails = await this.getMatriculaDetails(matriculaId);
      const confirmationExists = await this.confirmationExists(
        matriculaId,
        anoCorrente,
      );
      const matriculaActivaOuConfirmada =
        confirmationExists ||
        matriculaDetails.estado.toLowerCase() === 'activo';

      if (!matriculaActivaOuConfirmada) {
        return {
          message:
            'Matrícula não ativa e sem confirmação para o ano letivo atual. A troca de curso não pode ser realizada.',
          matriculaDetails,
          confirmationExists,
        };
      }
      const mesmoCurso = matriculaDetails.codigo_curso == cursoId;
      if (mesmoCurso) {
        throw new BadRequestException('Erro não pode-se mudar no mesmo curso');
      }
      mudarCurso = await this.podeMudarCurso(matriculaId);
      if (!mudarCurso) {
        throw new BadRequestException(
          'Erro não pode-se mudar o curso por falta de pagamento ou a pre-inscrição do estudante não desse ano lectivo',
        );
      }
      if (matriculaDetails.estado.toLowerCase() != 'activo') {
        throw new BadRequestException('O aluno deve ter uma matricula activa');
      }
      await this.registrarMotivo({
        codigoMatricula: matriculaId,
        codigoUtilizador: userId,
        cursoAnterior: matriculaDetails.codigo_curso,
        cursoSelecionado: cursoId!,
        motivo: motivo!,
      });
      const gradesEquivalentes = await this.buscarGradeCurricularEquivalentes({
        codigoMatricula: matriculaId,
        cursoAnterior: matriculaDetails.codigo_curso,
        cursoSelecionado: cursoId!,
      });

      await this.processarMudancaDeCursoGradesCurriculares(
        gradesEquivalentes,
        matriculaId,
      );

      await this.inscreverGradesAutomaticamente({
        codigoAnoLectivo: anoCorrente,
        codigoCurso: cursoId!,
        codigoMatricula: matriculaId,
        codigoPeriodo: matriculaDetails.codigo_periodo || 5,
        gradesEquivalentes: gradesEquivalentes,
        userId: userId,
      });
      await this.alterarCursoAluno(matriculaId, cursoId!);
      await this.queryRunner.commitTransaction();
      //await this.queryRunner.rollbackTransaction();
    } catch (err) {
      await this.queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await this.queryRunner.release();
    }
  }

  private async temIsencao(codigoMatricula: number) {
    const anoCorrente = await this.anoLectivoUtil.getAnoAtualId();
    const sql = `
    select i.CODIGO
    from FK2_TB_ISENCOES i
    inner join FK2_TB_TIPO_SERVICOS s
    on s.CODIGO = i.CODIGO_SERVICO
    where 1=1
    and i.CODIGO_ANOLECTIVO = :codigoAnoLectivo
    and UPPER (i.ESTADO_ISENSAO) = 'ACTIVO'
    AND I.CODIGO_MATRICULA = :codigoMatricula
    and s.sigla = :sigla
    `;
    const result = await this.queryRunner.query(sql, {
      sigla: SERVICE_SIGLA.CAMDCI,
      codigoMatricula: codigoMatricula,
      codigoAnoLectivo: anoCorrente,
    } as any);
    return result && result.length > 0;
  }

  private async temPagamentoValido(codigoMatricula: number) {
    const anoCorrente = await this.anoLectivoUtil.getAnoAtualId();
    const sql = `
    select pg.CODIGO
    from FK2_TB_PAGAMENTOS pg
    inner join FK2_FACTURA fa
    on fa.codigo = pg.CODIGO_FACTURA
    inner join FK2_FACTURA_ITEMS fi
    on fi.CODIGOFACTURA = fa.codigo
    inner join FK2_TB_TIPO_SERVICOS se
    on se.codigo = fi.CODIGOPRODUTO
    where 1=1
    and se.sigla = :sigla
    and fa.ano_lectivo = :codigoAnoLectivo
    and fa.estado = :estado
    and fa.codigomatricula = :codigoMatricula
    `;
    const result = await this.queryRunner.query(sql, {
      sigla: SERVICE_SIGLA.CAMDCI,
      codigoAnoLectivo: anoCorrente,
      codigoMatricula: codigoMatricula,
      estado: 1,
    } as any);

    return result && result.length > 0;
  }
  private async pagamentoOuIsencaoValido(codigoMatricula: number) {
    const temPagamento = await this.temPagamentoValido(codigoMatricula);
    const temIsencaoServico = await this.temIsencao(codigoMatricula);
    return temPagamento || temIsencaoServico;
  }

  private async preInscricaoDoAnoCorrente(codigoMatricula: number) {
    const anoCorrente = await this.anoLectivoUtil.getAnoAtualId();
    const sql = `
    SELECT
        p.ANOLECTIVO AS ANOLECTIVO
      FROM FK2_TB_MATRICULAS m
      INNER JOIN FK2_TB_ADMISSAO a
        ON a.codigo = m.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO p
        ON p.codigo = a.PRE_INCRICAO
      WHERE m.codigo = :codigoMatricula
    `;
    const result = await this.queryRunner.query(sql, {
      codigoMatricula: codigoMatricula,
    } as any);

    if (!result || result.length == 0) {
      throw new BadRequestException('Ano Lectivo de entrada não encontrada');
    }
    return result[0]?.ANOLECTIVO == anoCorrente;
  }

  private async podeMudarCurso(codigoMatricula: number) {
    const temPreInscricaoDoAnoCorrente =
      await this.preInscricaoDoAnoCorrente(codigoMatricula);
    if (temPreInscricaoDoAnoCorrente) return true;
    const temPagamentoOuIsencaoValido =
      await this.pagamentoOuIsencaoValido(codigoMatricula);
    return temPagamentoOuIsencaoValido;
  }

  private async registrarMotivo(params: RegistrarMotivoParams) {
    const {
      codigoMatricula,
      codigoUtilizador,
      cursoAnterior,
      cursoSelecionado,
      motivo,
    } = params;
    const sql = `
    insert
    into fk2_tb_motivo_alteracao_curso (
      codigo_matricula,
      codigo_utilizador,
      descricao,
      codigo_curso_anterior,
      codigo_curso_novo,
      dataalteracao
    )
    values (
      :codigoMatricula,
      :codigoUtilizador,
      :motivo,
      :codigoCursoAnterior,
      :codigoCursoNovo,
      sysdate
    )
    `;
    try {
      await this.queryRunner.query(sql, {
        codigoMatricula: codigoMatricula,
        codigoUtilizador: codigoUtilizador,
        codigoCursoAnterior: cursoAnterior,
        codigoCursoNovo: cursoSelecionado,
        motivo: motivo,
      } as any);
    } catch (error) {
      throw new BadRequestException('Erro ao tentar registrar motivo');
    }
  }
  private async buscarNovasGradeCurricularPrimeiroAno(
    codigoCurso: number,
  ): Promise<BuscarNovasGradeCurricularPrimeiroAnoReturnDTO[]> {
    const sql = `
    select
      distinct
      g.codigo_disciplina as codigo_disciplina,
      g.codigo_classe     as codigo_classe,
      g.codigo_semestre   as codigo_semestre,
      dis.DESIGNACAO      as disciplina,
      g.codigo            as codigo
    from FK2_TB_GRADE_CURRICULAR g
    inner join FK2_TB_PLANO_CURRICULAR_GRADE pcg
      on pcg.CODIGO_GRADE_CURRICULAR = g.CODIGO
    inner join FK2_TB_PLANO_CURRICULAR_CURSO pcc
      on pcc.CODIGO = pcg.CODIGO_PLANO_CURRICULAR_CURSO

    INNER JOIN FK2_TB_DISCIPLINAS dis
                ON dis.CODIGO = g.CODIGO_DISCIPLINA
    and g.status_ = 1
    and g.codigo_classe = 1
    and g.codigo_curso = :codigoCurso
    `;
    const result = await this.queryRunner.query(sql, {
      codigoCurso,
    } as any);

    if (!result || result.length == 0) {
      throw new BadRequestException(
        'Erro: Não foram encontradas grades curriculares activas',
      );
    }
    return toLowerCaseKeys(result);
  }
  private async buscarGradeCurricularEquivalentes(
    params: BuscarGradeCurricularEquivalentesParams,
  ): Promise<GradeCurricularEquivalenteDTO[]> {
    const { codigoMatricula, cursoSelecionado } = params;
    const sql = `
        SELECT *
        FROM (
            SELECT
                dis.DESIGNACAO             AS disciplina,
                al.CODIGO_GRADE_CURRICULAR AS codigo_grade,
                al.NOTA                    AS nota,
                gn.CODIGO                  AS codigo_grade_equivalente,
                al.Codigo                  AS codigo_grade_curricular_aluno,
                ROW_NUMBER() OVER (
                    PARTITION BY al.CODIGO_GRADE_CURRICULAR
                    ORDER BY gn.CODIGO
                ) AS RN

            FROM FK2_TB_GRADE_CURRICULAR_ALUNO al

            INNER JOIN FK2_TB_GRADE_CURRICULAR g
                ON g.CODIGO = al.CODIGO_GRADE_CURRICULAR

            INNER JOIN FK2_TB_DISCIPLINAS dis
                ON dis.CODIGO = g.CODIGO_DISCIPLINA

            INNER JOIN FK2_TB_GRADE_CURRICULAR gn
                ON gn.CODIGO_CURSO = :cursoSelecionado
               AND gn.STATUS_ = 1

            INNER JOIN FK2_TB_DISCIPLINAS dn
                ON dn.CODIGO = gn.CODIGO_DISCIPLINA
               AND (
                    dn.CODIGO = dis.CODIGO
                    OR UPPER(TRIM(dn.DESIGNACAO)) = UPPER(TRIM(dis.DESIGNACAO))
               )

            WHERE al.CODIGO_STATUS_GRADE_CURRICULAR = ${STATUS_GRADE.SUCESSO}
              AND al.CODIGO_MATRICULA = :codigoMatricula
        )
        WHERE RN = 1
    `;
    const result = await this.queryRunner.query(sql, {
      cursoSelecionado: cursoSelecionado,
      codigoMatricula: codigoMatricula,
    } as any);
    if (!result || result.length == 0) {
      return [];
    }
    return toLowerCaseKeys(result);
  }
  private async inativarGradeCurricularPorMudancaDeCurso(
    params: GradeCurricularEquivalenteDTO[],
    codigoMatricula: number,
  ) {
    //Desativar todas as grades anteriores do curso
    const ids = params.map((p) => p.codigo_grade_curricular_aluno);
    const whereNotIn = ids.length ? `AND codigo NOT IN (${ids.join(',')})` : '';

    const sql = `
    update fk2_tb_grade_curricular_aluno
    set codigo_status_grade_curricular = ${STATUS_GRADE.ELIMINADO},
        estado = 3,
        observacao = :observacao
    where 1=1
    and codigo_matricula = :codigoMatricula
    ${whereNotIn}
    `;
    await this.queryRunner.query(sql, {
      observacao: 'Eliminado Durante a Alteração de Curso',
      codigoMatricula: codigoMatricula,
    } as any);
  }

  private async aplicarEquivalenciaGradeCurricular(
    params: GradeCurricularEquivalenteDTO[],
  ) {
    for (const gradeEquivilante of params) {
      const sql = `
          update fk2_tb_grade_curricular_aluno
          set equivalencia = 1,
              codigo_grade_curricular = :codigo_grade_equivalente,
              observacao = :observacao
          where 1=1
          and codigo = :codigo_grade_curricular_aluno
      `;
      try {
        await this.queryRunner.query(sql, {
          codigo_grade_equivalente: gradeEquivilante.codigo_grade_equivalente,
          observacao: 'Mantida Por Equivalência Durante a Mudança de Curso',
          codigo_grade_curricular_aluno:
            gradeEquivilante.codigo_grade_curricular_aluno,
        } as any);
      } catch (error) {
        throw new BadRequestException('Erro ao tentar fazer a equivalencia');
      }
    }
  }
  private async buscarGradeCurricularesAnteriores(
    codigoMatricula: number,
  ): Promise<GradeCurricularAlunoAnteriorDTO[]> {
    const sql = `
    select
      codigo_grade_curricular,
      turma,
      codigo_confirmacao,
      codigo_matricula,
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
      equivalencia,
      ref_horario,
      ref_utilizador,
      codigo
    from fk2_tb_grade_curricular_aluno
    where 1=1
    and codigo_matricula = :codigoMatricula
    `;
    const result = await this.queryRunner.query(sql, {
      codigoMatricula: codigoMatricula,
    } as any);

    if (!result || result.length == 0) {
      throw new BadRequestException('Grade Curriculares Não encontrada');
    }
    return toLowerCaseKeys(result);
  }
  private async registarHistoricoGradeCurricular(
    params: GradeCurricularAlunoAnteriorDTO[],
  ) {
    const sql = `
    insert
    into fk2_tb_grade_curricular_aluno_historico (
      codigo_grade_curricular,
      turma,
      codigo_confirmacao,
      codigo_matricula,
      estado,
      created_at,
      user_id,
      canal,
      codigo_status_grade_curricular,
      codigo_ano_lectivo,
      epoca,
      observacao,
      updated_at,
      equivalencia,
      nota_anterior,
      nota_alterada,
      motivo_alteracao
    )
      values (
      :codigo_grade_curricular,
      :turma,
      :codigo_confirmacao,
      :codigo_matricula,
      :estado,
      :created_at,
      :user_id,
      :canal,
      :codigo_status_grade_curricular,
      :codigo_ano_lectivo,
      :epoca,
      :observacao,
      :updated_at,
      :equivalencia,
      :nota_anterior,
      :nota_alterada,
      :motivo_alteracao
      )
    `;
    for (const gradeCurricularAluno of params) {
      await this.queryRunner.query(sql, {
        codigo_grade_curricular: gradeCurricularAluno.codigo_grade_curricular,
        turma: gradeCurricularAluno.turma,
        codigo_confirmacao: gradeCurricularAluno.codigo_confirmacao,
        codigo_matricula: gradeCurricularAluno.codigo_matricula,
        estado: gradeCurricularAluno.estado,
        created_at: gradeCurricularAluno.created_at,
        user_id: gradeCurricularAluno.user_id,
        canal: gradeCurricularAluno.canal,
        codigo_status_grade_curricular:
          gradeCurricularAluno.codigo_status_grade_curricular,
        codigo_ano_lectivo: gradeCurricularAluno.codigo_ano_lectivo,
        epoca: gradeCurricularAluno.epoca,
        observacao: gradeCurricularAluno.observacao,
        updated_at: gradeCurricularAluno.updated_at,
        equivalencia: gradeCurricularAluno.equivalencia,
        nota_anterior: 0,
        nota_alterada: gradeCurricularAluno.nota,
        motivo_alteracao: null,
      } as any);
    }
  }
  private async processarMudancaDeCursoGradesCurriculares(
    gradesCurricularesEquivalentes: GradeCurricularEquivalenteDTO[],
    codigoMatricula: number,
  ) {
    await this.aplicarEquivalenciaGradeCurricular(
      gradesCurricularesEquivalentes,
    );
    await this.inativarGradeCurricularPorMudancaDeCurso(
      gradesCurricularesEquivalentes,
      codigoMatricula,
    );
    const gradeCurricularesAntigas =
      await this.buscarGradeCurricularesAnteriores(codigoMatricula);
    await this.registarHistoricoGradeCurricular(gradeCurricularesAntigas);
  }
  private async inscreverGradesAutomaticamente(
    params: InscreverGradesAutomaticamenteDTO,
  ) {
    const {
      codigoAnoLectivo,
      codigoCurso,
      codigoMatricula,
      codigoPeriodo,
      userId,
      gradesEquivalentes,
    } = params;
    const confirmacoes = await this.criarConfirmacoes(codigoMatricula);
    await this.criarGradeCurriculares({
      codigoAnoLectivo: codigoAnoLectivo,
      codigoConfirmacaoPrimeiroSemestre:
        confirmacoes.codigoConfirmacaoPrimeiroSemestre!,
      codigoConfirmacaoSegundoSemestre:
        confirmacoes.codigoConfirmacaoSegundoSemestre!,
      codigoCurso: codigoCurso,
      codigoMatricula: codigoMatricula,
      codigoPeriodo: codigoPeriodo,
      gradesEquivalentes: gradesEquivalentes,
      userId,
    });
  }
  private async criarConfirmacoes(
    codigoMatricula: number,
  ): Promise<CriarConfirmacoesDTO> {
    const codigoAnoLectivo = await this.anoLectivoUtil.getAnoAtualId();

    const sqlObterConfirmacoes = `
    SELECT
      codigo,
      semestre
    FROM fk2_tb_confirmacoes
    WHERE codigo_ano_lectivo = :codigoAnoLectivo
      AND estado = 1
      AND codigo_matricula = :codigoMatricula
  `;

    const sqlInsertConfirmacao = `
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

    const sqlUpdateConfirmacao = `
    UPDATE fk2_tb_confirmacoes
    SET semestre = :semestre,
        classe = 1
    WHERE codigo = :codigoConfirmacao
  `;

    const confirmacoes = await this.queryRunner.query(sqlObterConfirmacoes, {
      codigoMatricula,
      codigoAnoLectivo,
    } as any);

    if (!confirmacoes?.length) {
      throw new BadRequestException('Erro ao encontrar confirmações');
    }

    let codigoPrimeiro: number | null = null;
    let codigoSegundo: number | null = null;

    // ===== PRIMEIRO SEMESTRE =====
    const primeiroSemestre = confirmacoes.find(
      (item) => item.SEMESTRE === 1 || item.SEMESTRE == null,
    );

    if (primeiroSemestre) {
      await this.queryRunner.query(sqlUpdateConfirmacao, {
        semestre: 1,
        codigoConfirmacao: primeiroSemestre.CODIGO,
      } as any);

      codigoPrimeiro = primeiroSemestre.CODIGO;
    } else {
      const result = await this.queryRunner.query(sqlInsertConfirmacao, {
        codigoMatricula,
        codigoAnoLectivo,
        semestre: 1,
        codigoGerado: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      } as any);
      codigoPrimeiro = result.codigoGerado[0];
    }

    // ===== SEGUNDO SEMESTRE =====
    const segundoSemestre = confirmacoes.find((item) => item.SEMESTRE === 2);

    if (segundoSemestre) {
      await this.queryRunner.query(sqlUpdateConfirmacao, {
        semestre: 2,
        codigoConfirmacao: segundoSemestre.CODIGO,
      } as any);

      codigoSegundo = segundoSemestre.CODIGO;
    } else {
      const result = await this.queryRunner.query(sqlInsertConfirmacao, {
        codigoMatricula,
        codigoAnoLectivo,
        semestre: 2,
        codigoGerado: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      } as any);

      codigoSegundo = result.codigoGerado[0];
    }

    return {
      codigoConfirmacaoPrimeiroSemestre: codigoPrimeiro,
      codigoConfirmacaoSegundoSemestre: codigoSegundo,
    };
  }
  private async buscarHorario(params: BuscarhorarioDTO) {
    const { codigoGradeCurricular, codigoPeriodo } = params;
    const codigoAnoLectivo = await this.anoLectivoUtil.getAnoAtualId();
    const sqlBuscarHorario = `
      select
        pk_horario,
        designacao
      from fk2_mgh_tb_horario
      where 1=1
      and fk_estado_horario_wf = 3
      and fk_ano_lectivo	= :codigoAnoLectivo
      and fk_periodo = :codigoPeriodo
      and fk_grade_curricular = :codigoGradeCurricular
      and apenasprimeiroano = 1
      and diponivel = 1
      and active_state = 1
    `;

    const result = await this.queryRunner.query(sqlBuscarHorario, {
      codigoAnoLectivo: codigoAnoLectivo,
      codigoPeriodo: codigoPeriodo,
      codigoGradeCurricular: codigoGradeCurricular,
    } as any);

    if (!result || result.length == 0) {
      return null;
    }
    const row = result[0];
    return {
      pk: row?.PK_HORARIO,
      desc: row?.DESIGNACAO,
    };
  }
  private async alterarCursoAluno(
    codigoMatricula: number,
    cursoSelecionado: number,
  ) {
    const sqlAlterarCurso = `
    update fk2_tb_matriculas
    set codigo_curso = :cursoSelecionado
    where 1=1
    and codigo = :codigoMatricula
    `;
    try {
      await this.queryRunner.query(sqlAlterarCurso, {
        codigoMatricula: codigoMatricula,
        cursoSelecionado: cursoSelecionado,
      } as any);
    } catch (error) {
      throw new BadRequestException(
        'Erro ao tentar alterar o curso na matricula do aluno',
      );
    }
  }
  private async criarGradeCurriculares(params: CriarGradeCurricularDTO) {
    const {
      codigoCurso,
      codigoMatricula,
      gradesEquivalentes,
      codigoPeriodo,
      codigoConfirmacaoPrimeiroSemestre,
      codigoConfirmacaoSegundoSemestre,
      codigoAnoLectivo,
      userId,
    } = params;

    const sqlInserirGradeCurricularAluno = `
    insert
    into fk2_tb_grade_curricular_aluno (
      codigo_grade_curricular,
      codigo_confirmacao,
      codigo_matricula,
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
      equivalencia,
      ref_horario,
      ref_utilizador
    )
    values (
      :codigoGrade,                           --codigo_grade_curricular
      :codigoConfirmacao,                     --codigo_confirmacao
      :codigoMatricula,                       --codigoMatricula
      :estado,                                --estado
      0,
      sysdate,                                --created_at
      :userId,                                --user_id
      :canal,                                 --canal
      :codigoStatusGradeCurricular,           --codigo_status_grade_curricular
      :codigoAnoLectivo,
      1,
      :observacao,
      :codigo_utilizador,
      sysdate,
      0,
      :refHorario,
      :refUtilizador
    )
    `;

    const novasGradeCurriculares =
      await this.buscarNovasGradeCurricularPrimeiroAno(codigoCurso);
    const gradesCurriculares = novasGradeCurriculares.filter(
      (n) =>
        !gradesEquivalentes.some(
          (t) =>
            t.codigo_grade == n.codigo ||
            t.codigo_disciplina == n.codigo_disciplina ||
            t.disciplina.toUpperCase().trim() ==
              n.disciplina.toUpperCase().trim(),
        ),
    );
    const nomeUtilizador = await this.getNomeUser(userId);
    const refUser = {
      pk: userId,
      desc: nomeUtilizador,
    };
    for (const grade of gradesCurriculares) {
      const horario = await this.buscarHorario({
        codigoGradeCurricular: grade.codigo,
        codigoPeriodo: codigoPeriodo,
      });
      const refHorario = horario == null ? horario : JSON.stringify(horario);
      const confirmacao =
        grade.codigo_semestre == 1
          ? codigoConfirmacaoPrimeiroSemestre
          : codigoConfirmacaoSegundoSemestre;

      await this.queryRunner.query(sqlInserirGradeCurricularAluno, {
        codigoGrade: grade.codigo,
        codigoConfirmacao: confirmacao,
        codigoMatricula: codigoMatricula,
        estado: 1,
        userId: userId,
        canal: 1,
        codigoStatusGradeCurricular: STATUS_GRADE.CURSO,
        codigoAnoLectivo: codigoAnoLectivo,
        observacao: 'Inscrição automática durante a mudança de Curso!',
        codigo_utilizador: userId,
        refHorario: refHorario,
        refUtilizador: JSON.stringify(refUser),
      } as any);
    }
  }
}
