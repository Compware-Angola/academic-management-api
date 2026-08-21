import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GeneralAgendaDto } from './dto/list-general-agenda.dto';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { EstadoAvaliacaoEnum } from './types/types';

@Injectable()
export class GenaralAgendaService {
  private anoAtualPrincipal: number;
  constructor(
    private readonly dataSource: DataSource,
    private readonly anoLectivoUtil: AnoLectivoUtil,
  ) {
    this.initAnoAtual();
  }
  private async initAnoAtual() {
    this.anoAtualPrincipal = await this.anoLectivoUtil.getAnoAtualId();
  }

  async findAll(dto: GeneralAgendaDto) {
    const {
      horario,
      anoLectivo,
      semestre,
      gradeCurricular,
      gradeCurricularTurma,
      turma,
      page = 1,
      limit = 20,
    } = dto;

    let listaPauta: any[] = [];
    let grade: any;
    let total: any;

    try {
      if (horario) {
        grade = await this.findGradeCurricularByCodigo(gradeCurricular);

        if (grade) {
          listaPauta = await this.carregarPautaHorario(
            grade,
            horario,
            anoLectivo,
            page,
            limit,
          );
          total = await this.countEstudantesByHorarioAndAnoLectivo(
            grade.CODIGO_CURSO,
            anoLectivo,
            horario,
          );
        }
      } else {
        grade = await this.findGradeCurricularByCodigo(gradeCurricularTurma);

        if (grade) {
          listaPauta = await this.carregarPautaTurma(
            grade,
            turma,
            anoLectivo,
            page,
            limit,
          );
          total = await this.countEstudantesByTurmaAndAnoLectivo(
            grade.CODIGO_CURSO,
            anoLectivo,
            turma,
          );
        }
      }

      return {
        data: listaPauta,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Erro em findAll:', error);
      return [];
    }
  }

  private async findGradeCurricularByCodigo(pk_grade: number) {
    const grade = await this.dataSource.query(
      `
    SELECT *
    FROM FK2_TB_GRADE_CURRICULAR gdc
    WHERE gdc.CODIGO = :pk_grade

  `,
      [pk_grade],
    );
    return grade[0];
  }

  private async carregarPautaHorario(
    grade: any,
    scheduleId: number,
    anoCorrente: number,
    page: number,
    limit: number,
  ): Promise<any[]> {
    const pautaGeral: any[] = [];

    const schedule = await this.getSchedule(scheduleId);

    if (!schedule) {
      console.warn('Horário não encontrado:', scheduleId);
      return pautaGeral;
    }
    const offset = (page - 1) * limit;
    const listaDeEstudanteDoHorario =
      await this.findEstudantesByHorarioAndAnoLectivo(
        grade.CODIGO_CURSO,
        anoCorrente,
        scheduleId,
        offset,
        limit,
      );

    if (listaDeEstudanteDoHorario.length === 0) {
      console.log('Nenhum estudante encontrado no horário:', scheduleId);
      return pautaGeral; // array vazio
    }

    // Processa cada estudante e guarda o resultado
    for (const estudante of listaDeEstudanteDoHorario) {
      const gradeDoEstudante = await this.retornarGradeAvaliadaByGrade(
        grade.CODIGO,
        anoCorrente,
        estudante.NUMERO_MATRICULA,
      );

      if (gradeDoEstudante) {
        const pautaDoAluno = await this.processarNotasHorario(
          estudante.NUMERO_DE_MATRICULA || estudante.NUMERO_MATRICULA,
          gradeDoEstudante,
        );

        if (pautaDoAluno) {
          pautaGeral.push(pautaDoAluno);
        }
      }
    }

    console.log(
      `Pauta gerada para ${pautaGeral.length} alunos no horário ${scheduleId}`,
    );
    return pautaGeral;
  }
  private async carregarPautaTurma(
    grade: any,
    turmaId: number,
    anoCorrente: number,
    page: number,
    limit: number,
  ) {
    const pautaGeral: any[] = [];
    const result = await this.findTurmasById(turmaId);
    if (!result) {
      console.warn('Turma não encontrada:', turmaId);
      return pautaGeral;
    }
    const offset = (page - 1) * limit;
    const listaDeEstudanteDoHorario =
      await this.findEstudantesByTurmaAndAnoLectivo(
        grade.CODIGO_CURSO,
        turmaId,
        anoCorrente,
        offset,
        limit,
      );
    if (listaDeEstudanteDoHorario.length === 0) {
      console.log('Nenhum estudante encontrado na Turma:', turmaId);
      return pautaGeral;
    }

    for (const estudante of listaDeEstudanteDoHorario) {
      const gradeDoEstudante = await this.retornarGradeAvaliadaByGrade(
        grade.CODIGO,
        anoCorrente,
        estudante.NUMERO_MATRICULA,
      );

      if (gradeDoEstudante) {
        const pautaDoAluno = await this.processarNotasTurma(
          estudante.NUMERO_DE_MATRICULA || estudante.NUMERO_MATRICULA,
          gradeDoEstudante,
        );

        if (pautaDoAluno) {
          pautaGeral.push(pautaDoAluno);
        }
      }
    }

    return pautaGeral;
  }

  private async getSchedule(pkHorario: number): Promise<any> {
    const schedule = await this.dataSource.query(
      `
            SELECT DISTINCT * FROM FK2_MGH_TB_HORARIO m
             WHERE m.PK_HORARIO  = :pkHorario
              AND m.ACTIVE_STATE  = 1
             AND  m.FK_ESTADO_HORARIO_WF != 4
              ORDER BY m.DESIGNACAO  ASC`,
      [pkHorario],
    );
    return schedule;
  }

  private async findTurmasById(codigoTurma: number): Promise<any> {
    const turma = await this.dataSource.query(
      `
           SELECT * FROM FK2_TB_TURMAS turma WHERE turma.codigo = :codigoTurma`,
      [codigoTurma],
    );

    return turma;
  }

  private async findEstudantesByHorarioAndAnoLectivo(
    curso: number,
    ano_lectivo: number,
    pk_horario: number,
    offset: number,
    limit: number,
  ): Promise<any[]> {
    const students = await this.dataSource.query(
      `
    SELECT *
    FROM (
      SELECT
        tm.Codigo AS numero_matricula,
        tp2.Nome_Completo AS nome,
        tc.Designacao AS curso,
        tp3.Designacao AS periodo
      FROM FK2_TB_MATRICULAS tm
      INNER JOIN FK2_TB_ADMISSAO ta2 ON ta2.codigo = tm.Codigo_Aluno
      INNER JOIN FK2_TB_PREINSCRICAO tp2 ON tp2.Codigo = ta2.pre_incricao
      INNER JOIN FK2_TB_CURSOS tc ON tc.Codigo = tm.Codigo_Curso
      INNER JOIN FK2_TB_PERIODOS tp3 ON tp3.Codigo = tp2.Codigo_Turno
      WHERE 1=1
        ---tc.codigo = :curso
        AND tm.estado_matricula = 'activo'
        AND tm.Codigo IN (
          SELECT DISTINCT tgca.codigo_matricula
          FROM FK2_MGH_TB_HORARIO mth
          INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca
            ON JSON_VALUE(tgca.ref_horario, '$.pk') = mth.pk_horario
          WHERE mth.active_state = 1
            AND mth.fk_estado_horario_wf != 4
            AND tgca.codigo_ano_lectivo = :ano_lectivo
            AND tgca.Codigo_Status_Grade_Curricular IN (1,2,3)
            AND mth.pk_horario = :pk_horario
        )
      ORDER BY tp2.Nome_Completo ASC
    )
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `,
      {
        ano_lectivo,
        pk_horario,
        offset,
        limit,
      } as any,
    );

    return students;
  }
  private async countEstudantesByHorarioAndAnoLectivo(
    curso: number,
    ano_lectivo: number,
    pk_horario: number,
  ): Promise<number> {
    const result = await this.dataSource.query(
      `
    SELECT COUNT(*) AS total
    FROM FK2_TB_MATRICULAS tm
    INNER JOIN FK2_TB_CURSOS tc ON tc.Codigo = tm.Codigo_Curso
    WHERE 1=1
      ---tc.codigo = :curso
      AND tm.estado_matricula = 'activo'
      AND tm.Codigo IN (
        SELECT DISTINCT tgca.codigo_matricula
        FROM FK2_MGH_TB_HORARIO mth
        INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca
          ON JSON_VALUE(tgca.ref_horario, '$.pk') = mth.pk_horario
        WHERE mth.active_state = 1
          AND mth.fk_estado_horario_wf != 4
          AND tgca.codigo_ano_lectivo = :ano_lectivo
          AND tgca.Codigo_Status_Grade_Curricular IN (1,2,3)
          AND mth.pk_horario = :pk_horario
      )
    `,
      { ano_lectivo, pk_horario } as any,
    );

    return Number(result[0]?.TOTAL || 0);
  }

  private async findEstudantesByTurmaAndAnoLectivo(
    curso: number,
    ano_lectivo: number,
    pk_turma: number,
    offset: number,
    limit: number,
  ): Promise<any[]> {
    const students = await this.dataSource.query(
      `
    SELECT *
    FROM (
      SELECT
        tm.Codigo AS numero_matricula,
        tp2.Nome_Completo AS nome,
        tc.Designacao AS curso,
        tp3.Designacao AS periodo
      FROM FK2_TB_MATRICULAS tm
      INNER JOIN FK2_TB_ADMISSAO ta2 ON ta2.codigo = tm.Codigo_Aluno
      INNER JOIN FK2_TB_PREINSCRICAO tp2 ON tp2.Codigo = ta2.pre_incricao
      INNER JOIN FK2_TB_CURSOS tc ON tc.Codigo = tm.Codigo_Curso
      INNER JOIN FK2_TB_PERIODOS tp3 ON tp3.Codigo = tp2.Codigo_Turno
      INNER JOIN FK2_TB_TURMAS tt ON tt.Codigo = tm.Codigo_Turma
      WHERE tc.codigo = :curso
        AND tm.estado_matricula = 'activo'
        AND tm.Codigo_Turma = :pk_turma
        AND tm.Codigo IN (
          SELECT DISTINCT tgca.codigo_matricula
          FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
          WHERE tgca.codigo_ano_lectivo = :ano_lectivo
            AND tgca.Codigo_Status_Grade_Curricular IN (1,2,3)
        )
      ORDER BY tp2.Nome_Completo ASC
    )
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `,
      {
        curso,
        ano_lectivo,
        pk_turma,
        offset,
        limit,
      } as any,
    );

    return students;
  }
  private async countEstudantesByTurmaAndAnoLectivo(
    curso: number,
    ano_lectivo: number,
    pk_turma: number,
  ): Promise<number> {
    const result = await this.dataSource.query(
      `
    SELECT COUNT(*) AS total
    FROM FK2_TB_MATRICULAS tm
    INNER JOIN FK2_TB_CURSOS tc ON tc.Codigo = tm.Codigo_Curso
    WHERE tc.codigo = :curso
      AND tm.estado_matricula = 'activo'
      AND tm.Codigo_Turma = :pk_turma
      AND tm.Codigo IN (
        SELECT DISTINCT tgca.codigo_matricula
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        WHERE tgca.codigo_ano_lectivo = :ano_lectivo
          AND tgca.Codigo_Status_Grade_Curricular IN (1,2,3)
      )
    `,
      { curso, ano_lectivo, pk_turma } as any,
    );

    return Number(result[0]?.TOTAL || 0);
  }

  private async retornarGradeAvaliadaByGrade(
    grade: number,
    anoLectivo: number,
    numeroDeMatricula: number,
    obs: string = '%Migração%',
  ): Promise<any> {
    try {
      const grades = await this.dataSource.query(
        `
            SELECT
                ftgca.CODIGO_GRADE_CURRICULAR,
                ftgca.TURMA,
                ftgca.CODIGO_CONFIRMACAO,
                ftgca.CODIGO_MATRICULA,
                ftgca.ESTADO,
                ftgca.NOTA,
                ftgca.CREATED_AT,
                ftgca.CODIGO_STATUS_GRADE_CURRICULAR,
                ftgca.CODIGO_ANO_LECTIVO,
                ftgca.EPOCA,
                ftgca.OBSERVACAO,
                ftgca.CODIGO_UTILIZADOR,
                ftgca.UPDATED_AT,
                ftgca.EQUIVALENCIA,
                ftgca.CODIGO,
                ftgca.REF_HORARIO,

                ftgc.CODIGO_CURSO,
                ftgc.CODIGO_DISCIPLINA,
                ftgc.CODIGO_SEMESTRE,
                ftgc.HORASTOTAIS,
                ftgc.HORASTEORICAS,
                ftgc.HORASTEORICOSPRATICAS,
                ftgc.HORASPRATICAS,
                ftgc.DATA_REGISTO,
                ftgc.DATA_ULTIMAA_ATUALIZACAO,
                ftgc.USER_,
                ftgc.HORASESTAGIO,
                ftgc.HORASSEMINARIO,
                ftgc.HORASRELATORIO,
                ftgc.NUM_MAX_FALTAS,
                ftgc.VALOR_INSCRICAO,
                ftgc.CANAL,
                ftgc.STATUS_,
                ftgc.PESO_PRIMEIRA_FREQ,
                ftgc.NOTA_MIN_PRIMEIRA_FREQ,
                ftgc.PESO_SEGUNDA_FREQ,
                ftgc.NOTA_MIN_SEGUNDA_FREQ,
                ftgc.PESO_PRATICA,
                ftgc.NOTA_MIN_PRATICA,
                ftgc.FORMULA_DEFIDA_POR,
                ftgc.UTILIZADOR,
                ftgc.FK_DEPARTAMENTO,
                ftgc.CODIGO AS CODIGO_GRADE_CURRICULA,

                dc.DURACAO,
                dc.DESIGNACAO AS DISCIPLINA,
                CASE
                    WHEN ftgc.type = 'DEPARTAMENTO'
                    THEN COALESCE(clp.DESIGNACAO, cl.DESIGNACAO)
                    ELSE cl.DESIGNACAO
                END AS CLASSE,

                drc.DESIGNACAO AS DURACAO_PLANO,

                tm.Codigo AS numero_matricula,
                tp2.Nome_Completo AS Nome_Completo,
                tc.Designacao AS curso,
                tp3.Designacao AS periudo,
                sm.DESIGNACAO AS SEMESTRE

            FROM FK2_TB_GRADE_CURRICULAR_ALUNO ftgca
                LEFT JOIN FK2_TB_GRADE_CURRICULAR ftgc
                    ON ftgc.CODIGO = ftgca.CODIGO_GRADE_CURRICULAR
                LEFT JOIN FK2_TB_DISCIPLINAS dc
                    ON dc.CODIGO = ftgc.CODIGO_DISCIPLINA
                LEFT JOIN FK2_TB_CLASSES cl
                    ON cl.CODIGO = ftgc.CODIGO_CLASSE
                LEFT JOIN FK2_TB_DURACAO drc
                    ON drc.CODIGO = dc.DURACAO
                LEFT JOIN FK2_TB_SEMESTRES sm
                    ON sm.CODIGO = ftgc.CODIGO_SEMESTRE

            INNER JOIN FK2_TB_MATRICULAS tm
                ON ftgca.CODIGO_MATRICULA = tm.CODIGO
            INNER JOIN FK2_TB_ADMISSAO ta2
                ON ta2.codigo = tm.Codigo_Aluno
            INNER JOIN FK2_TB_PREINSCRICAO tp2
                ON tp2.Codigo = ta2.pre_incricao
            INNER JOIN FK2_TB_CURSOS tc
                ON tc.Codigo = tm.Codigo_Curso
            INNER JOIN FK2_TB_PERIODOS tp3
                ON tp3.Codigo = tp2.Codigo_Turno
            LEFT JOIN (
                    SELECT
                        pcgs.CODIGO_GRADE_CURRICULAR,
                        ppc.CODIGO_CURSO,
                        pcgs.CODIGO_CLASSE,
                        ROW_NUMBER() OVER (
                            PARTITION BY pcgs.CODIGO_GRADE_CURRICULAR, ppc.CODIGO_CURSO
                            ORDER BY
                                CASE WHEN ppc.CODIGO_ANO_LECTIVO = :anoLectivo THEN 0 ELSE 1 END,
                                pcgs.CODIGO DESC
                        ) AS RN
                    FROM FK2_TB_PLANO_CURRICULAR_GRADE_SEMESTRE pcgs
                    INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO ppc
                            ON ppc.CODIGO = pcgs.CODIGO_PLANO_CURRICULAR_CURSO
                ) dept_classe
                    ON dept_classe.CODIGO_GRADE_CURRICULAR = ftgc.CODIGO
                   AND ftgc.type = 'DEPARTAMENTO'
                   AND dept_classe.CODIGO_CURSO = tm.CODIGO_CURSO
                   AND dept_classe.RN = 1
                LEFT JOIN FK2_TB_CLASSES clp
                    ON clp.CODIGO = dept_classe.CODIGO_CLASSE
            WHERE ftgca.CODIGO_GRADE_CURRICULAR = :grade
                AND ftgca.CODIGO_STATUS_GRADE_CURRICULAR IN (2, 3,1)
                AND ftgca.CODIGO_MATRICULA = :numeroDeMatricula
                AND ftgca.CODIGO_ANO_LECTIVO = :anoLectivo
                AND ftgca.OBSERVACAO NOT LIKE :obs
            ORDER BY CODIGO_GRADE_CURRICULAR ASC
        `,
        {
          grade,
          anoLectivo,
          numeroDeMatricula,
          obs,
        } as any,
      );
      return grades[0] || null;
    } catch (error: any) {
      console.error('Erro ao buscar grade avaliada:', error);
      throw new Error(
        `Falha ao consultar grade curricular avaliada: ${error.message}`,
      );
    }
  }
  private async findOnePlanoByCursoAndAnoLectivo(
    codigoCurso: number,
    codigoAnoLectivo: number,
  ): Promise<any> {
    const planoCurso = await this.dataSource.query(
      `
        SELECT *
        FROM FK2_TB_PLANO_CURRICULAR_CURSO plano
        WHERE plano.CODIGO_CURSO =:codigoCurso  OR 0 =:codigoCurso
          AND plano.CODIGO_ANO_LECTIVO = :codigoAnoLectivo OR 0 = :codigoAnoLectivo
    `,
      {
        codigoCurso,
        codigoAnoLectivo,
      } as any,
    );

    return planoCurso[0];
  }
  private async findByPlanoAndUnidadeCurricular(
    plano: number,
    codigoUnidadeCurricular: number,
  ): Promise<any> {
    const planoUnidade = await this.dataSource.query(
      `SELECT *  from
     FK2_TB_PLANO_CURRICULAR_GRADE grade
     WHERE grade.CODIGO_PLANO_CURRICULAR_CURSO = :plano
     AND grade.CODIGO_GRADE_CURRICULAR = :codigoUnidadeCurricular`,
      [plano, codigoUnidadeCurricular],
    );
    return planoUnidade[0];
  }

  private async processarNotasHorario(
    codigoMatricula: number,
    gradeAluno: any,
  ): Promise<any> {
    let media = 0;
    let descricao = '';
    const anoCorrente = this.anoAtualPrincipal;
    let resultado =
      gradeAluno.CODIGO_ANO_LECTIVO === anoCorrente
        ? EstadoAvaliacaoEnum.PENDENTE
        : EstadoAvaliacaoEnum.REPROVADO;

    // Inicialização correta da pauta
    const pauta: any = {
      obs: [],
      formula: [],
      nota1f: '',
      nota2f: '',
      notaEx: '',
      notaRec: '',
      notaPra: '',
      notaOr: '',
      notaOrRec: '',
      notaMel: '',
      notaEE: '',
      notaOEE: '',
    };

    try {
      console.log(`\nCADEIRA a verificar -----> `, gradeAluno.DISCIPLINA);

      const avaliacoes = await this.buscarAvaliacoes(gradeAluno.CODIGO);

      const getNota = (tipo: number) =>
        avaliacoes.find((a) => a.TIPO_AVALIACAO === tipo) || null;

      const nota1f = getNota(2);
      const nota2f = getNota(3);
      const notaEx = getNota(6);
      const notaRec = getNota(7);
      const notaPra = getNota(4);
      const notaOr = getNota(9);
      const notaOrRec = getNota(23);
      const notaMel = getNota(22);
      const notaEE = getNota(11);
      const notaOEE = getNota(24);

      //====================== Ano lectivo histórico (já encerrado) ========================================
      if (
        gradeAluno.CODIGO_ANO_LECTIVO < anoCorrente &&
        gradeAluno.NOTA !== null &&
        gradeAluno.NOTA !== undefined &&
        gradeAluno.NOTA !== ''
      ) {
        media = Number(gradeAluno.NOTA);
        resultado =
          media >= 10
            ? EstadoAvaliacaoEnum.APROVADO
            : EstadoAvaliacaoEnum.REPROVADO;

        pauta.ano = gradeAluno.CLASSE;
        pauta.codigoGradeAluno = gradeAluno.CODIGO;
        pauta.disciplina = gradeAluno.DISCIPLINA;
        pauta.duracao = gradeAluno.DURACAO_PLANO;
        pauta.gradeCurricula = gradeAluno.CODIGO_GRADE_CURRICULA;
        pauta.matricula = gradeAluno.CODIGO_MATRICULA;
        pauta.media = media.toString();
        pauta.nome_completo = gradeAluno.NOME_COMPLETO;
        pauta.num_matricula = gradeAluno.CODIGO_MATRICULA.toString();
        pauta.resultado = resultado;
        pauta.semestre = gradeAluno.SEMESTRE;
        pauta.unidadeCurricular = gradeAluno.DISCIPLINA;
        pauta.obs.push(
          'Ano lectivo já encerrado. Nota consolidada da grade aplicada directamente, sem recálculo de fórmula.',
        );

        pauta.nota1f = nota1f?.NOTA?.toString() ?? '';
        pauta.nota2f = nota2f?.NOTA?.toString() ?? '';
        pauta.notaEx = notaEx?.NOTA?.toString() ?? '';
        pauta.notaRec = notaRec?.NOTA?.toString() ?? '';
        pauta.notaPra = notaPra?.NOTA?.toString() ?? '';
        pauta.notaOr = notaOr?.NOTA?.toString() ?? '';
        pauta.notaOrRec = notaOrRec?.NOTA?.toString() ?? '';
        pauta.notaMel = notaMel?.NOTA?.toString() ?? '';
        pauta.notaEE = notaEE?.NOTA?.toString() ?? '';
        pauta.notaOEE = notaOEE?.NOTA?.toString() ?? '';

        return pauta;
      }

      // Busca dos planos curriculares
      const planoCurricularCurso = await this.findOnePlanoByCursoAndAnoLectivo(
        gradeAluno.CODIGO_CURSO,
        gradeAluno.CODIGO_ANO_LECTIVO,
      );

      const planoCurricularGrade = planoCurricularCurso
        ? await this.findByPlanoAndUnidadeCurricular(
          planoCurricularCurso.CODIGO,
          gradeAluno.CODIGO_GRADE_CURRICULAR,
        )
        : undefined;

      // Cache das verificações mais usadas
      let hasPratica =
        planoCurricularGrade?.TEM_PRATICA === true ||
        planoCurricularGrade?.TEM_PRATICA === 1;
      const hasOral =
        planoCurricularGrade?.TEM_ORAL === true ||
        planoCurricularGrade?.TEM_ORAL === 1;

      if (hasPratica && hasOral) {
        console.warn(
          `Grade curricular ${gradeAluno.CODIGO_GRADE_CURRICULAR}: TEM_PRATICA e TEM_ORAL estão ambos activos no plano curricular. A priorizar TEM_ORAL.`,
        );
        hasPratica = false;
      }

      // Helper local para evitar chamadas repetidas
      const temNota = (nota: any): boolean =>
        nota !== null &&
        nota !== undefined &&
        nota.NOTA !== null &&
        nota.NOTA !== undefined;

      // Cache para temNotaLancadaNoHorario (chamado várias vezes)
      const lancadaCache: { [key: number]: boolean } = {};
      const getLancada = async (tipo: number): Promise<boolean> => {
        if (!(tipo in lancadaCache)) {
          lancadaCache[tipo] = await this.temNotaLancadaNoHorario(
            gradeAluno,
            tipo,
          );
        }
        return lancadaCache[tipo];
      };

      console.log('notaMel--->', notaMel, notaPra);

      // === NENHUMA NOTA LANÇADA ===
      if (
        !temNota(nota1f) &&
        !temNota(nota2f) &&
        !temNota(notaEx) &&
        !temNota(notaRec) &&
        !temNota(notaPra) &&
        !temNota(notaOr) &&
        !temNota(notaOrRec) &&
        !temNota(notaMel) &&
        !temNota(notaEE)
      ) {
        if (gradeAluno.CODIGO_ANO_LECTIVO === anoCorrente) {
          const semestre = gradeAluno.CODIGO_SEMESTRE;
          const dataActual = new Date();

          if (semestre === 1) {
            if (
              dataActual >
              (await this.getDataFimPrimeiroSemestre(
                gradeAluno.CODIGO_ANO_LECTIVO,
              ))
            ) {
              resultado = EstadoAvaliacaoEnum.REPROVADO;
              descricao = 'O estudante não teve nenhuma nota lançada;';
            } else {
              resultado = EstadoAvaliacaoEnum.PENDENTE;
              descricao = 'Sem avaliações;';
            }
          } else {
            if (
              dataActual >
              (await this.getDataFimSegundoSemestre(
                gradeAluno.CODIGO_ANO_LECTIVO,
              ))
            ) {
              resultado = EstadoAvaliacaoEnum.REPROVADO;
              descricao = 'O estudante não teve nenhuma nota lançada;';
            } else {
              resultado = EstadoAvaliacaoEnum.PENDENTE;
              descricao = 'Sem avaliações;';
            }
          }
        } else {
          resultado = EstadoAvaliacaoEnum.REPROVADO;
          descricao = 'O estudante não teve nenhuma nota lançada;';
        }
        pauta.obs.push(descricao);
        console.log(descricao);
      }
      // === MELHORIA DE NOTA (notaMel >= 10) ===
      else if (temNota(notaMel) && notaMel.NOTA! >= 10) {
        media = notaMel.NOTA!;
        resultado = EstadoAvaliacaoEnum.APROVADO;
        descricao = 'A média das duas Freqências é suficiente para aprovação!';
        pauta.obs.push(descricao);
        console.log(descricao);
      }
      // === LÓGICA NORMAL DE AVALIAÇÃO ===
      else {
        // Frequências — média aritmética (1ªFreq + 2ªFreq [+ Prática|Oral]) / N.
        // A 1ª e a 2ª Frequência são obrigatórias: se já foram lançadas na
        // turma/horário mas o aluno não tem nota, entram como 0 no cálculo
        // (não existe fase de "Exame" substituto). Se nenhuma das duas foi
        // lançada na turma/horário, o aluno aguarda avaliação.
        if ((await getLancada(2)) || (await getLancada(3))) {
          if (!temNota(nota1f)) {
            pauta.obs.push(
              'O docente não fez o lançamento da nota da 1ª Frequência para o estudante; foi considerada 0 no cálculo (avaliação obrigatória).',
            );
          }
          if (!temNota(nota2f)) {
            pauta.obs.push(
              'O docente não fez o lançamento da nota da 2ª Frequência para o estudante; foi considerada 0 no cálculo (avaliação obrigatória).',
            );
          }

          const mediaFreq = this.round(
            ((nota1f?.NOTA ?? 0) + (nota2f?.NOTA ?? 0)) / 2,
          );

          if (hasPratica) {
            // A Prática é obrigatória: não depende da média das frequências.
            media = mediaFreq;
            resultado = EstadoAvaliacaoEnum.AGUARDA_PRATICA;
            descricao = `Media das duas Frequências (${media}). Aguardar nota da Prática (avaliação obrigatória)!`;
          } else if (hasOral) {
            // A Oral é obrigatória: não depende da média das frequências.
            media = mediaFreq;
            resultado = EstadoAvaliacaoEnum.AGUARDA_ORAL;
            descricao = `Media das duas Frequências (${media}). Aguardar nota da Prova Oral (avaliação obrigatória)!`;
          } else {
            media = mediaFreq;
            if (media >= 10) {
              resultado = EstadoAvaliacaoEnum.APROVADO;
              descricao =
                'A média das duas Freqências é suficiente para aprovação!';
            } else {
              resultado = EstadoAvaliacaoEnum.RECURSO;
              descricao =
                'A média das duas Frequências é insuficiêncte para aprovação, deve fazer a prova de Recurso!';
            }
          }
          pauta.obs.push(descricao);
          console.log(descricao);
        } else {
          resultado =
            gradeAluno.CODIGO_ANO_LECTIVO === anoCorrente
              ? EstadoAvaliacaoEnum.PENDENTE
              : EstadoAvaliacaoEnum.REPROVADO;
          descricao =
            gradeAluno.CODIGO_ANO_LECTIVO === anoCorrente
              ? 'Aguarda avaliação da 1ª/2ª Frequência'
              : 'O estudante não teve nenhuma nota lançada;';
          pauta.obs.push(descricao);
          console.log(descricao);
        }

        // Prática (quando em AGUARDA_PRATICA) — média aritmética (1ªFreq + 2ªFreq + Prática) / 3.
        // A Prática é obrigatória: se ausente, entra como 0. Se insuficiente, o
        // Recurso (nota seca) substitui esta média por completo — a Prática não
        // volta a ser considerada no Recurso.
        // Corre antes do Recurso porque não depende dele nem do Exame.
        if (
          resultado === EstadoAvaliacaoEnum.AGUARDA_PRATICA &&
          (await getLancada(4))
        ) {
          if (!temNota(notaPra)) {
            pauta.obs.push(
              'O docente não fez o lançamento da nota da Prática para o estudante; foi considerada 0 no cálculo (avaliação obrigatória).',
            );
          }

          media = this.round(
            ((nota1f?.NOTA ?? 0) + (nota2f?.NOTA ?? 0) + (notaPra?.NOTA ?? 0)) /
            3,
          );

          if (media >= 10) {
            resultado = EstadoAvaliacaoEnum.APROVADO;
            descricao = `A média (1ªFreq + 2ªFreq + Prática) (${media}) é suficiente para a aprovação!`;
          } else {
            resultado = EstadoAvaliacaoEnum.RECURSO;
            descricao = `A média (1ªFreq + 2ªFreq + Prática) (${media}) é insuficiente para aprovação, deve fazer a prova de Recurso!`;
          }
          pauta.obs.push(descricao);
          console.log(descricao);
        }

        // Oral Normal — média aritmética (1ªFreq + 2ªFreq + Oral) / 3.
        // A Oral é obrigatória: se ausente, entra como 0. Corre antes do Recurso
        // para que, se insuficiente, o bloco de Recurso (logo a seguir) já
        // capture o RECURSO e prossiga para a combinação com a Oral de Recurso.
        if (
          resultado === EstadoAvaliacaoEnum.AGUARDA_ORAL &&
          (await getLancada(9))
        ) {
          if (!temNota(notaOr)) {
            pauta.obs.push(
              'O docente não fez o lançamento da nota da Prova Oral para o estudante; foi considerada 0 no cálculo (avaliação obrigatória).',
            );
          }

          media = this.round(
            ((nota1f?.NOTA ?? 0) + (nota2f?.NOTA ?? 0) + (notaOr?.NOTA ?? 0)) /
            3,
          );

          if (media >= 10) {
            resultado = EstadoAvaliacaoEnum.APROVADO;
            descricao = `A média (1ªFreq + 2ªFreq + Oral) (${media}) é suficiente para aprovação!`;
          } else {
            resultado = EstadoAvaliacaoEnum.RECURSO;
            descricao = `A média (1ªFreq + 2ªFreq + Oral) (${media}) é insuficiente para aprovação, deve fazer a prova de Recurso!`;
          }
          pauta.obs.push(descricao);
          console.log(descricao);
        }

        // Recurso
        if (resultado === EstadoAvaliacaoEnum.RECURSO) {
          if (await getLancada(7)) {
            if (hasOral) {
              // A Prova Oral é obrigatória e combina sempre com o Recurso,
              // mesmo que a nota do Recurso escrito seja baixa ou ausente.
              media = notaRec?.NOTA ?? 0;
              resultado = EstadoAvaliacaoEnum.AGUARDA_ORAL_RECURSO;
              descricao =
                'Aguardar nota da Prova Oral de Recurso para calcular a média final (Recurso + Oral de Recurso)!';
            } else if (!temNota(notaRec)) {
              // Sem excepção, ou com Prática (que não é aplicada no recurso) —
              // o Recurso é sempre nota seca.
              resultado = EstadoAvaliacaoEnum.REPROVADO;
              descricao =
                'O docente não fez o lançamento da nota do recurso para o estudante!';
            } else {
              media = notaRec!.NOTA!;
              if (notaRec!.NOTA! >= 10) {
                resultado = EstadoAvaliacaoEnum.APROVADO;
                descricao =
                  'A nota do Recurso é suficiente para aprovação. OBS: A nota do Recurso é seca para esta avaliação!';
              } else {
                resultado = EstadoAvaliacaoEnum.REPROVADO;
                descricao = `A nota do Recurso (${notaRec!.NOTA!}) é insuficiente para aprovação directa!`;
              }
            }
            pauta.obs.push(descricao);
            console.log(descricao);
          }
        }

        // Oral de Recurso — média aritmética (Recurso + Oral de Recurso) / 2.
        // A Oral de Recurso é obrigatória: se ausente, entra como 0 e decide já.
        if (
          resultado === EstadoAvaliacaoEnum.AGUARDA_ORAL_RECURSO &&
          (await getLancada(23))
        ) {
          if (!temNota(notaOrRec)) {
            pauta.obs.push(
              'O docente não fez o lançamento da nota da Prova Oral de Recurso para o estudante; foi considerada 0 no cálculo (avaliação obrigatória).',
            );
          }

          media = this.calcularMediaRecursoOral(notaRec, notaOrRec);
          if (media >= 10) {
            resultado = EstadoAvaliacaoEnum.APROVADO;
            descricao = `A média do Recurso escrito e da Prova Oral de Recurso (${media}) é suficiente para Aprovação!`;
          } else {
            resultado = EstadoAvaliacaoEnum.REPROVADO;
            descricao = `A média do Recurso escrito e da Prova Oral de Recurso (${media}) é insuficiente para aprovação directa!`;
          }
          pauta.obs.push(descricao);
          console.log(descricao);
        }

        // Melhoria após aprovação normal
        if (
          resultado === EstadoAvaliacaoEnum.APROVADO &&
          temNota(notaMel) &&
          notaMel!.NOTA! > media
        ) {
          descricao = `Aprovado com média (${media}) Porém o estudante fez a melhoria da nota onde conseguiu superar esta média conseguindo assim (${notaMel!.NOTA!})`;
          pauta.obs.push(descricao);
          console.log(descricao);
          media = notaMel!.NOTA!;
        }
      }

      // === EXAME ESPECIAL ===
      // A Prova Oral é obrigatória: se hasOral, o aluno vai sempre para a Oral
      // do Exame Especial, independentemente da nota do Exame Especial.
      if (temNota(notaEE)) {
        media = notaEE!.NOTA!;
        if (hasOral) {
          resultado = EstadoAvaliacaoEnum.AGUARDA_ORAL_EXAME_ESPECIAL;
          descricao = `A nota do Exame Especial (${media}) foi registada. Aguardar nota da Prova Oral (avaliação obrigatória)!`;
        } else {
          if (media >= 10) {
            resultado = EstadoAvaliacaoEnum.APROVADO;
            descricao = `A nota do Exame Especial (${media}) é suficiente para aprovação directa!`;
          } else {
            resultado = EstadoAvaliacaoEnum.REPROVADO;
            descricao = `A nota do Exame Especial (${media}) é insuficiente para aprovação directa!`;
          }
        }
        pauta.obs.push(descricao);
        console.log(descricao);
      }

      // === ORAL DO EXAME ESPECIAL ===
      // Média aritmética (Exame Especial + Oral do Exame Especial) / 2.
      // A Oral do Exame Especial é obrigatória: se ausente, entra como 0 e decide já.
      if (resultado === EstadoAvaliacaoEnum.AGUARDA_ORAL_EXAME_ESPECIAL) {
        if (!temNota(notaOEE)) {
          pauta.obs.push(
            'O docente não fez o lançamento da nota da Prova Oral do Exame Especial para o estudante; foi considerada 0 no cálculo (avaliação obrigatória).',
          );
        }

        media = this.round(((notaEE?.NOTA ?? 0) + (notaOEE?.NOTA ?? 0)) / 2);

        if (media >= 10) {
          resultado = EstadoAvaliacaoEnum.APROVADO;
          descricao = `A média do Exame Especial e da Prova Oral do Exame Especial (${media}) é suficiente para aprovação directa!`;
        } else {
          resultado = EstadoAvaliacaoEnum.REPROVADO;
          descricao = `A média do Exame Especial e da Prova Oral do Exame Especial (${media}) é insuficiente para aprovação directa!`;
        }
        pauta.obs.push(descricao);
        console.log(descricao);
      }

      // === PREENCHIMENTO FINAL DA PAUTA ===
      pauta.ano = gradeAluno.CLASSE;
      pauta.codigoGradeAluno = gradeAluno.CODIGO;
      pauta.disciplina = gradeAluno.DISCIPLINA;
      pauta.duracao = gradeAluno.DURACAO_PLANO;
      pauta.gradeCurricula = gradeAluno.CODIGO_GRADE_CURRICULA;
      pauta.matricula = gradeAluno.CODIGO_MATRICULA;
      pauta.media = media.toString();
      pauta.nome_completo = gradeAluno.NOME_COMPLETO;
      pauta.num_matricula = gradeAluno.CODIGO_MATRICULA.toString();
      pauta.resultado = resultado;
      pauta.semestre = gradeAluno.SEMESTRE;
      pauta.unidadeCurricular = gradeAluno.DISCIPLINA;

      // Fórmulas
      let formula = 'Média Aritmética: (1ªFreq + 2ªFreq) / 2';
      if (hasPratica) {
        formula = 'Média Aritmética: (1ªFreq + 2ªFreq + Prática) / 3';
      } else if (hasOral) {
        formula = 'Média Aritmética: (1ªFreq + 2ªFreq + Oral) / 3';
      }
      pauta.formula.push(formula);

      if (hasOral) {
        formula = 'Média Aritmética: (Recurso + Oral de Recurso) / 2';
      } else {
        formula =
          'Nota mínima de 10 valores, sendo que para está unidade curricular a nota é seca.';
      }
      pauta.formula.push(formula);

      // Regra final: tudo que não for APROVADO ou PENDENTE vira REPROVADO
      if (
        pauta.resultado !== EstadoAvaliacaoEnum.APROVADO &&
        pauta.resultado !== EstadoAvaliacaoEnum.PENDENTE
      ) {
        pauta.resultado = EstadoAvaliacaoEnum.REPROVADO;
      }

      // Notas individuais
      pauta.nota1f = nota1f?.NOTA?.toString() ?? '';
      pauta.nota2f = nota2f?.NOTA?.toString() ?? '';
      pauta.notaEx = notaEx?.NOTA?.toString() ?? '';
      pauta.notaRec = notaRec?.NOTA?.toString() ?? '';
      pauta.notaPra = notaPra?.NOTA?.toString() ?? '';
      pauta.notaOr = notaOr?.NOTA?.toString() ?? '';
      pauta.notaOrRec = notaOrRec?.NOTA?.toString() ?? '';
      pauta.notaMel = notaMel?.NOTA?.toString() ?? '';
      pauta.notaEE = notaEE?.NOTA?.toString() ?? '';
      pauta.notaOEE = notaOEE?.NOTA?.toString() ?? '';

      console.log(resultado);
      console.log(media);
      console.log(descricao);
      console.log('\n');

      return pauta;
    } catch (error) {
      console.error('----> NÃO FOI POSSÍVEL ACTUALIZAR <-----', error);
      throw error; // ou return null / objeto de erro
    }
  }
  private async processarNotasTurma(
    codigoMatricula: number,
    gradeAluno: any,
  ): Promise<any> {
    let media = 0;
    let descricao = '';
    const anoCorrente = this.anoAtualPrincipal;
    let resultado =
      gradeAluno.CODIGO_ANO_LECTIVO === anoCorrente
        ? EstadoAvaliacaoEnum.PENDENTE
        : EstadoAvaliacaoEnum.REPROVADO;

    // Inicialização correta da pauta
    const pauta: any = {
      obs: [],
      formula: [],
      nota1f: '',
      nota2f: '',
      notaEx: '',
      notaRec: '',
      notaPra: '',
      notaOr: '',
      notaOrRec: '',
      notaMel: '',
      notaEE: '',
      notaOEE: '',
    };

    try {
      console.log(`\nCADEIRA a verificar -----> `, gradeAluno.DISCIPLINA);

      const avaliacoes = await this.buscarAvaliacoes(gradeAluno.CODIGO);

      const getNota = (tipo: number) =>
        avaliacoes.find((a) => a.TIPO_AVALIACAO === tipo) || null;

      const nota1f = getNota(2);
      const nota2f = getNota(3);
      const notaEx = getNota(6);
      const notaRec = getNota(7);
      const notaPra = getNota(4);
      const notaOr = getNota(9);
      const notaOrRec = getNota(23);
      const notaMel = getNota(22);
      const notaEE = getNota(11);
      const notaOEE = getNota(24);

      //====================== Ano lectivo histórico (já encerrado) ========================================
      if (
        gradeAluno.CODIGO_ANO_LECTIVO < anoCorrente &&
        gradeAluno.NOTA !== null &&
        gradeAluno.NOTA !== undefined &&
        gradeAluno.NOTA !== ''
      ) {
        media = Number(gradeAluno.NOTA);
        resultado =
          media >= 10
            ? EstadoAvaliacaoEnum.APROVADO
            : EstadoAvaliacaoEnum.REPROVADO;

        pauta.ano = gradeAluno.CLASSE;
        pauta.codigoGradeAluno = gradeAluno.CODIGO;
        pauta.disciplina = gradeAluno.DISCIPLINA;
        pauta.duracao = gradeAluno.DURACAO_PLANO;
        pauta.gradeCurricula = gradeAluno.CODIGO_GRADE_CURRICULA;
        pauta.matricula = gradeAluno.CODIGO_MATRICULA;
        pauta.media = media.toString();
        pauta.nome_completo = gradeAluno.NOME_COMPLETO;
        pauta.num_matricula = gradeAluno.CODIGO_MATRICULA.toString();
        pauta.resultado = resultado;
        pauta.semestre = gradeAluno.SEMESTRE;
        pauta.unidadeCurricular = gradeAluno.DISCIPLINA;
        pauta.obs.push(
          'Ano lectivo já encerrado. Nota consolidada da grade aplicada directamente, sem recálculo de fórmula.',
        );

        pauta.nota1f = nota1f?.NOTA?.toString() ?? '';
        pauta.nota2f = nota2f?.NOTA?.toString() ?? '';
        pauta.notaEx = notaEx?.NOTA?.toString() ?? '';
        pauta.notaRec = notaRec?.NOTA?.toString() ?? '';
        pauta.notaPra = notaPra?.NOTA?.toString() ?? '';
        pauta.notaOr = notaOr?.NOTA?.toString() ?? '';
        pauta.notaOrRec = notaOrRec?.NOTA?.toString() ?? '';
        pauta.notaMel = notaMel?.NOTA?.toString() ?? '';
        pauta.notaEE = notaEE?.NOTA?.toString() ?? '';
        pauta.notaOEE = notaOEE?.NOTA?.toString() ?? '';

        return pauta;
      }

      // Busca dos planos curriculares
      const planoCurricularCurso = await this.findOnePlanoByCursoAndAnoLectivo(
        gradeAluno.CODIGO_CURSO,
        gradeAluno.CODIGO_ANO_LECTIVO,
      );

      const planoCurricularGrade = planoCurricularCurso
        ? await this.findByPlanoAndUnidadeCurricular(
          planoCurricularCurso.CODIGO,
          gradeAluno.CODIGO_GRADE_CURRICULAR,
        )
        : undefined;

      // Cache das verificações mais usadas
      let hasPratica =
        planoCurricularGrade?.TEM_PRATICA === true ||
        planoCurricularGrade?.TEM_PRATICA === 1;
      const hasOral =
        planoCurricularGrade?.TEM_ORAL === true ||
        planoCurricularGrade?.TEM_ORAL === 1;

      if (hasPratica && hasOral) {
        console.warn(
          `Grade curricular ${gradeAluno.CODIGO_GRADE_CURRICULAR}: TEM_PRATICA e TEM_ORAL estão ambos activos no plano curricular. A priorizar TEM_ORAL.`,
        );
        hasPratica = false;
      }

      // Helper local para evitar chamadas repetidas
      const temNota = (nota: any): boolean =>
        nota !== null &&
        nota !== undefined &&
        nota.NOTA !== null &&
        nota.NOTA !== undefined;

      // Cache para temNotaLancadaNaTurma (chamado várias vezes)
      const lancadaCache: { [key: number]: boolean } = {};
      const getLancada = async (tipo: number): Promise<boolean> => {
        if (!(tipo in lancadaCache)) {
          lancadaCache[tipo] = await this.temNotaLancadaNaTurma(
            gradeAluno,
            tipo,
          );
        }
        return lancadaCache[tipo];
      };

      console.log('notaMel--->', notaMel, notaPra);

      // === NENHUMA NOTA LANÇADA ===
      if (
        !temNota(nota1f) &&
        !temNota(nota2f) &&
        !temNota(notaEx) &&
        !temNota(notaRec) &&
        !temNota(notaPra) &&
        !temNota(notaOr) &&
        !temNota(notaOrRec) &&
        !temNota(notaMel) &&
        !temNota(notaEE)
      ) {
        if (gradeAluno.CODIGO_ANO_LECTIVO === anoCorrente) {
          const semestre = gradeAluno.CODIGO_SEMESTRE;
          const dataActual = new Date();

          if (semestre === 1) {
            if (
              dataActual >
              (await this.getDataFimPrimeiroSemestre(
                gradeAluno.CODIGO_ANO_LECTIVO,
              ))
            ) {
              resultado = EstadoAvaliacaoEnum.REPROVADO;
              descricao = 'O estudante não teve nenhuma nota lançada;';
            } else {
              resultado = EstadoAvaliacaoEnum.PENDENTE;
              descricao = 'Sem avaliações;';
            }
          } else {
            if (
              dataActual >
              (await this.getDataFimSegundoSemestre(
                gradeAluno.CODIGO_ANO_LECTIVO,
              ))
            ) {
              resultado = EstadoAvaliacaoEnum.REPROVADO;
              descricao = 'O estudante não teve nenhuma nota lançada;';
            } else {
              resultado = EstadoAvaliacaoEnum.PENDENTE;
              descricao = 'Sem avaliações;';
            }
          }
        } else {
          resultado = EstadoAvaliacaoEnum.REPROVADO;
          descricao = 'O estudante não teve nenhuma nota lançada;';
        }
        pauta.obs.push(descricao);
        console.log(descricao);
      }
      // === MELHORIA DE NOTA (notaMel >= 10) ===
      else if (temNota(notaMel) && notaMel.NOTA! >= 10) {
        media = notaMel.NOTA!;
        resultado = EstadoAvaliacaoEnum.APROVADO;
        descricao = 'A média das duas Freqências é suficiente para aprovação!';
        pauta.obs.push(descricao);
        console.log(descricao);
      }
      // === LÓGICA NORMAL DE AVALIAÇÃO ===
      else {
        // Frequências — média aritmética (1ªFreq + 2ªFreq [+ Prática|Oral]) / N.
        // A 1ª e a 2ª Frequência são obrigatórias: se já foram lançadas na
        // turma/horário mas o aluno não tem nota, entram como 0 no cálculo
        // (não existe fase de "Exame" substituto). Se nenhuma das duas foi
        // lançada na turma/horário, o aluno aguarda avaliação.
        if ((await getLancada(2)) || (await getLancada(3))) {
          if (!temNota(nota1f)) {
            pauta.obs.push(
              'O docente não fez o lançamento da nota da 1ª Frequência para o estudante; foi considerada 0 no cálculo (avaliação obrigatória).',
            );
          }
          if (!temNota(nota2f)) {
            pauta.obs.push(
              'O docente não fez o lançamento da nota da 2ª Frequência para o estudante; foi considerada 0 no cálculo (avaliação obrigatória).',
            );
          }

          const mediaFreq = this.round(
            ((nota1f?.NOTA ?? 0) + (nota2f?.NOTA ?? 0)) / 2,
          );

          if (hasPratica) {
            // A Prática é obrigatória: não depende da média das frequências.
            media = mediaFreq;
            resultado = EstadoAvaliacaoEnum.AGUARDA_PRATICA;
            descricao = `Media das duas Frequências (${media}). Aguardar nota da Prática (avaliação obrigatória)!`;
          } else if (hasOral) {
            // A Oral é obrigatória: não depende da média das frequências.
            media = mediaFreq;
            resultado = EstadoAvaliacaoEnum.AGUARDA_ORAL;
            descricao = `Media das duas Frequências (${media}). Aguardar nota da Prova Oral (avaliação obrigatória)!`;
          } else {
            media = mediaFreq;
            if (media >= 10) {
              resultado = EstadoAvaliacaoEnum.APROVADO;
              descricao =
                'A média das duas Freqências é suficiente para aprovação!';
            } else {
              resultado = EstadoAvaliacaoEnum.RECURSO;
              descricao =
                'A média das duas Frequências é insuficiêncte para aprovação, deve fazer a prova de Recurso!';
            }
          }
          pauta.obs.push(descricao);
          console.log(descricao);
        } else {
          resultado =
            gradeAluno.CODIGO_ANO_LECTIVO === anoCorrente
              ? EstadoAvaliacaoEnum.PENDENTE
              : EstadoAvaliacaoEnum.REPROVADO;
          descricao =
            gradeAluno.CODIGO_ANO_LECTIVO === anoCorrente
              ? 'Aguarda avaliação da 1ª/2ª Frequência'
              : 'O estudante não teve nenhuma nota lançada;';
          pauta.obs.push(descricao);
          console.log(descricao);
        }

        // Prática (quando em AGUARDA_PRATICA) — média aritmética (1ªFreq + 2ªFreq + Prática) / 3.
        // A Prática é obrigatória: se ausente, entra como 0. Se insuficiente, o
        // Recurso (nota seca) substitui esta média por completo — a Prática não
        // volta a ser considerada no Recurso.
        // Corre antes do Recurso porque não depende dele nem do Exame.
        if (
          resultado === EstadoAvaliacaoEnum.AGUARDA_PRATICA &&
          (await getLancada(4))
        ) {
          if (!temNota(notaPra)) {
            pauta.obs.push(
              'O docente não fez o lançamento da nota da Prática para o estudante; foi considerada 0 no cálculo (avaliação obrigatória).',
            );
          }

          media = this.round(
            ((nota1f?.NOTA ?? 0) + (nota2f?.NOTA ?? 0) + (notaPra?.NOTA ?? 0)) /
            3,
          );

          if (media >= 10) {
            resultado = EstadoAvaliacaoEnum.APROVADO;
            descricao = `A média (1ªFreq + 2ªFreq + Prática) (${media}) é suficiente para a aprovação!`;
          } else {
            resultado = EstadoAvaliacaoEnum.RECURSO;
            descricao = `A média (1ªFreq + 2ªFreq + Prática) (${media}) é insuficiente para aprovação, deve fazer a prova de Recurso!`;
          }
          pauta.obs.push(descricao);
          console.log(descricao);
        }

        // Oral Normal — média aritmética (1ªFreq + 2ªFreq + Oral) / 3.
        // A Oral é obrigatória: se ausente, entra como 0. Corre antes do Recurso
        // para que, se insuficiente, o bloco de Recurso (logo a seguir) já
        // capture o RECURSO e prossiga para a combinação com a Oral de Recurso.
        if (
          resultado === EstadoAvaliacaoEnum.AGUARDA_ORAL &&
          (await getLancada(9))
        ) {
          if (!temNota(notaOr)) {
            pauta.obs.push(
              'O docente não fez o lançamento da nota da Prova Oral para o estudante; foi considerada 0 no cálculo (avaliação obrigatória).',
            );
          }

          media = this.round(
            ((nota1f?.NOTA ?? 0) + (nota2f?.NOTA ?? 0) + (notaOr?.NOTA ?? 0)) /
            3,
          );

          if (media >= 10) {
            resultado = EstadoAvaliacaoEnum.APROVADO;
            descricao = `A média (1ªFreq + 2ªFreq + Oral) (${media}) é suficiente para aprovação!`;
          } else {
            resultado = EstadoAvaliacaoEnum.RECURSO;
            descricao = `A média (1ªFreq + 2ªFreq + Oral) (${media}) é insuficiente para aprovação, deve fazer a prova de Recurso!`;
          }
          pauta.obs.push(descricao);
          console.log(descricao);
        }

        // Recurso
        if (resultado === EstadoAvaliacaoEnum.RECURSO) {
          if (await getLancada(7)) {
            if (hasOral) {
              // A Prova Oral é obrigatória e combina sempre com o Recurso,
              // mesmo que a nota do Recurso escrito seja baixa ou ausente.
              media = notaRec?.NOTA ?? 0;
              resultado = EstadoAvaliacaoEnum.AGUARDA_ORAL_RECURSO;
              descricao =
                'Aguardar nota da Prova Oral de Recurso para calcular a média final (Recurso + Oral de Recurso)!';
            } else if (!temNota(notaRec)) {
              // Sem excepção, ou com Prática (que não é aplicada no recurso) —
              // o Recurso é sempre nota seca.
              resultado = EstadoAvaliacaoEnum.REPROVADO;
              descricao =
                'O docente não fez o lançamento da nota do recurso para o estudante!';
            } else {
              media = notaRec!.NOTA!;
              if (notaRec!.NOTA! >= 10) {
                resultado = EstadoAvaliacaoEnum.APROVADO;
                descricao =
                  'A nota do Recurso é suficiente para aprovação. OBS: A nota do Recurso é seca para esta avaliação!';
              } else {
                resultado = EstadoAvaliacaoEnum.REPROVADO;
                descricao = `A nota do Recurso (${notaRec!.NOTA!}) é insuficiente para aprovação directa!`;
              }
            }
            pauta.obs.push(descricao);
            console.log(descricao);
          }
        }

        // Oral de Recurso — média aritmética (Recurso + Oral de Recurso) / 2.
        // A Oral de Recurso é obrigatória: se ausente, entra como 0 e decide já.
        if (
          resultado === EstadoAvaliacaoEnum.AGUARDA_ORAL_RECURSO &&
          (await getLancada(23))
        ) {
          if (!temNota(notaOrRec)) {
            pauta.obs.push(
              'O docente não fez o lançamento da nota da Prova Oral de Recurso para o estudante; foi considerada 0 no cálculo (avaliação obrigatória).',
            );
          }

          media = this.calcularMediaRecursoOral(notaRec, notaOrRec);
          if (media >= 10) {
            resultado = EstadoAvaliacaoEnum.APROVADO;
            descricao = `A média do Recurso escrito e da Prova Oral de Recurso (${media}) é suficiente para Aprovação!`;
          } else {
            resultado = EstadoAvaliacaoEnum.REPROVADO;
            descricao = `A média do Recurso escrito e da Prova Oral de Recurso (${media}) é insuficiente para aprovação directa!`;
          }
          pauta.obs.push(descricao);
          console.log(descricao);
        }

        // Melhoria após aprovação normal
        if (
          resultado === EstadoAvaliacaoEnum.APROVADO &&
          temNota(notaMel) &&
          notaMel!.NOTA! > media
        ) {
          descricao = `Aprovado com média (${media}) Porém o estudante fez a melhoria da nota onde conseguiu superar esta média conseguindo assim (${notaMel!.NOTA!})`;
          pauta.obs.push(descricao);
          console.log(descricao);
          media = notaMel!.NOTA!;
        }
      }

      // === EXAME ESPECIAL ===
      // A Prova Oral é obrigatória: se hasOral, o aluno vai sempre para a Oral
      // do Exame Especial, independentemente da nota do Exame Especial.
      if (temNota(notaEE)) {
        media = notaEE!.NOTA!;
        if (hasOral) {
          resultado = EstadoAvaliacaoEnum.AGUARDA_ORAL_EXAME_ESPECIAL;
          descricao = `A nota do Exame Especial (${media}) foi registada. Aguardar nota da Prova Oral (avaliação obrigatória)!`;
        } else {
          if (media >= 10) {
            resultado = EstadoAvaliacaoEnum.APROVADO;
            descricao = `A nota do Exame Especial (${media}) é suficiente para aprovação directa!`;
          } else {
            resultado = EstadoAvaliacaoEnum.REPROVADO;
            descricao = `A nota do Exame Especial (${media}) é insuficiente para aprovação directa!`;
          }
        }
        pauta.obs.push(descricao);
        console.log(descricao);
      }

      // === ORAL DO EXAME ESPECIAL ===
      // Média aritmética (Exame Especial + Oral do Exame Especial) / 2.
      // A Oral do Exame Especial é obrigatória: se ausente, entra como 0 e decide já.
      if (resultado === EstadoAvaliacaoEnum.AGUARDA_ORAL_EXAME_ESPECIAL) {
        if (!temNota(notaOEE)) {
          pauta.obs.push(
            'O docente não fez o lançamento da nota da Prova Oral do Exame Especial para o estudante; foi considerada 0 no cálculo (avaliação obrigatória).',
          );
        }

        media = this.round(((notaEE?.NOTA ?? 0) + (notaOEE?.NOTA ?? 0)) / 2);

        if (media >= 10) {
          resultado = EstadoAvaliacaoEnum.APROVADO;
          descricao = `A média do Exame Especial e da Prova Oral do Exame Especial (${media}) é suficiente para aprovação directa!`;
        } else {
          resultado = EstadoAvaliacaoEnum.REPROVADO;
          descricao = `A média do Exame Especial e da Prova Oral do Exame Especial (${media}) é insuficiente para aprovação directa!`;
        }
        pauta.obs.push(descricao);
        console.log(descricao);
      }

      // === PREENCHIMENTO FINAL DA PAUTA ===
      pauta.ano = gradeAluno.CLASSE;
      pauta.codigoGradeAluno = gradeAluno.CODIGO;
      pauta.disciplina = gradeAluno.DISCIPLINA;
      pauta.duracao = gradeAluno.DURACAO_PLANO;
      pauta.gradeCurricula = gradeAluno.CODIGO_GRADE_CURRICULA;
      pauta.matricula = gradeAluno.CODIGO_MATRICULA;
      pauta.media = media.toString();
      pauta.nome_completo = gradeAluno.NOME_COMPLETO;
      pauta.num_matricula = gradeAluno.CODIGO_MATRICULA.toString();
      pauta.resultado = resultado;
      pauta.semestre = gradeAluno.SEMESTRE;
      pauta.unidadeCurricular = gradeAluno.DISCIPLINA;

      // Fórmulas
      let formula = 'Média Aritmética: (1ªFreq + 2ªFreq) / 2';
      if (hasPratica) {
        formula = 'Média Aritmética: (1ªFreq + 2ªFreq + Prática) / 3';
      } else if (hasOral) {
        formula = 'Média Aritmética: (1ªFreq + 2ªFreq + Oral) / 3';
      }
      pauta.formula.push(formula);

      if (hasOral) {
        formula = 'Média Aritmética: (Recurso + Oral de Recurso) / 2';
      } else {
        formula =
          'Nota mínima de 10 valores, sendo que para está unidade curricular a nota é seca.';
      }
      pauta.formula.push(formula);

      // Regra final: tudo que não for APROVADO ou PENDENTE vira REPROVADO
      if (
        pauta.resultado !== EstadoAvaliacaoEnum.APROVADO &&
        pauta.resultado !== EstadoAvaliacaoEnum.PENDENTE
      ) {
        pauta.resultado = EstadoAvaliacaoEnum.REPROVADO;
      }

      // Notas individuais
      pauta.nota1f = nota1f?.NOTA?.toString() ?? '';
      pauta.nota2f = nota2f?.NOTA?.toString() ?? '';
      pauta.notaEx = notaEx?.NOTA?.toString() ?? '';
      pauta.notaRec = notaRec?.NOTA?.toString() ?? '';
      pauta.notaPra = notaPra?.NOTA?.toString() ?? '';
      pauta.notaOr = notaOr?.NOTA?.toString() ?? '';
      pauta.notaOrRec = notaOrRec?.NOTA?.toString() ?? '';
      pauta.notaMel = notaMel?.NOTA?.toString() ?? '';
      pauta.notaEE = notaEE?.NOTA?.toString() ?? '';
      pauta.notaOEE = notaOEE?.NOTA?.toString() ?? '';

      console.log(resultado);
      console.log(media);
      console.log(descricao);
      console.log('\n');

      return pauta;
    } catch (error) {
      console.error('----> NÃO FOI POSSÍVEL ACTUALIZAR <-----', error);
      throw error; // ou return null / objeto de erro
    }
  }


  private async buscarAvaliacoes(gradeAlunoId: number): Promise<any[]> {
    return await this.dataSource.query(
      `
    SELECT avaliacao.*
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES avaliacao
    WHERE avaliacao.GRADE_CURRICULAR_ALUNO = :1
      AND avaliacao.TIPO_AVALIACAO IN (2,3,6,7,4,9,23,22,11,24)
  `,
      [gradeAlunoId],
    );
  }

  private async temNotaLancadaNaTurma(
    gradeAluno: any,
    tipoavaliacao: number,
  ): Promise<boolean> {
    const turma = gradeAluno.TURMA;
    const gradeCurricular = gradeAluno.CODIGO_GRADE_CURRICULAR;

    const result = await this.dataSource.query(
      `
        SELECT 1
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO grade
        INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES avaliacoes
            ON avaliacoes.GRADE_CURRICULAR_ALUNO = grade.CODIGO
        WHERE avaliacoes.TIPO_AVALIACAO = :tipoavaliacao
          AND grade.TURMA = :turma
          AND grade.CODIGO_GRADE_CURRICULAR = :gradeCurricular
        FETCH FIRST 1 ROWS ONLY
    `,
      [tipoavaliacao, turma, gradeCurricular],
    );

    return result.length > 0;
  }

  async temNotaLancadaNoHorario(
    gradeAluno: any,
    tipoAvaliacao: number,
  ): Promise<boolean> {
    const pk = this.extrairPkDoRefHorario(gradeAluno.REF_HORARIO);
    if (pk === null) {
      return false;
    }

    const query = `
        SELECT 1
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO grade
        INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES avaliacoes
            ON avaliacoes.GRADE_CURRICULAR_ALUNO = grade.CODIGO
        WHERE avaliacoes.TIPO_AVALIACAO = :tipo
          AND json_value(grade.REF_HORARIO,'$.pk') = :pk
          AND grade.CODIGO_GRADE_CURRICULAR = :gradeCurricular
        FETCH FIRST 1 ROW ONLY
    `;

    try {
      const result = await this.dataSource.query(query, {
        tipo: tipoAvaliacao,
        pk: Number(pk),
        gradeCurricular: gradeAluno.CODIGO_GRADE_CURRICULAR,
      } as any);

      return result.length > 0;
    } catch (error: any) {
      console.error('Erro em temNotaLancadaNoHorario:', error);
      return false;
    }
  }
  private extrairPkDoRefHorario(refHorario: string): number | null {
    try {
      if (!refHorario) return null;
      const obj = JSON.parse(refHorario);
      return obj.pk ? Number(obj.pk) : null;
    } catch (e) {
      console.warn('REF_HORARIO inválido ou não é JSON:', refHorario);
      return null;
    }
  }

  private round(value: number): number {
    return Math.round(value);
  }

  private calcularMediaRecursoOral(notaRec: any, notaOrRec: any): number {
    return this.round(((notaRec?.NOTA ?? 0) + (notaOrRec?.NOTA ?? 0)) / 2);
  }

  private async getDataFimPrimeiroSemestre(ano: number): Promise<Date> {
    const first = await this.dataSource.query(
      `
        SELECT DATAFIMPRIMEIROSEMESTRE  FROM FK2_TB_ANO_LECTIVO
        WHERE CODIGO =: ano
        `,
      [ano],
    );
    return first[0].DATAFIMPRIMEIROSEMESTRE;
  }

  private async getDataFimSegundoSemestre(ano: number): Promise<Date> {
    const first = await this.dataSource.query(
      `
        SELECT DATAFIMSEGUNDOSEMESTRE  FROM FK2_TB_ANO_LECTIVO
        WHERE CODIGO =: ano
        `,
      [ano],
    );
    return first[0].DATAFIMSEGUNDOSEMESTRE;
  }
}
