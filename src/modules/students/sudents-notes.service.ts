import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EstadoAvaliacaoEnum } from '../assessment/types/types';
import { FindStudentNoteDTO } from './dto/find-student-notes.dto';
import { calcularSemestreByAnoLectivo } from '../util/calcular-semestre';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { lowercaseKeys } from '../util/lowercase-keys.util';
import {
  FindCurriculumParams,
  StudentCurriculumGradeRow,
} from './dto/find-student-curriculum.dto';

@Injectable()
export class StudentNoteService {
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

  async findAll(dto: FindStudentNoteDTO) {
    const {
      anoLectivo,
      codigoMatricula,
      isPortal = true,
      page = 1,
      limit = 20,
    } = dto;

    const pautas = await this.carregarPautaHorario(
      anoLectivo,
      codigoMatricula,
      isPortal,
      page,
      limit,
    );
    return {
      data: pautas,
    };
  }

  private async carregarPautaHorario(
    anoLectivo: number,
    codigoMatricula: number,
    isPortal: boolean,
    page: number,
    limit: number,
  ): Promise<any[]> {
    const pautas: any[] = [];
    const gradesDoEstudante = await this.retornarGradeAvaliadaByGrade(
      anoLectivo,
      codigoMatricula,
    );
    console.log(gradesDoEstudante);
    for (const grades of gradesDoEstudante) {
      try {
        const pautaDoAluno = await this.processarNotasHorario(
          codigoMatricula,
          isPortal,
          grades,
        );

        pautas.push(pautaDoAluno);
      } catch (error) {
        console.log(error);
      }
    }

    return pautas;
  }

  private async retornarGradeAvaliadaByGrade(
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

            WHERE 1=1
                ---AND ftgca.CODIGO_GRADE_CURRICULAR = :grade
                AND ftgca.estado = 1
               AND ftgca.CODIGO_STATUS_GRADE_CURRICULAR <> 5
                AND ftgca.CODIGO_MATRICULA = :numeroDeMatricula
                AND ftgca.CODIGO_ANO_LECTIVO = :anoLectivo
              AND (
                  ftgca.OBSERVACAO IS NULL
                  OR ftgca.OBSERVACAO NOT LIKE :obs
              )
            ORDER BY CODIGO_GRADE_CURRICULAR ASC
        `,
        {
          anoLectivo,
          numeroDeMatricula,
          obs,
        } as any,
      );

      return grades || [];
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
    isPortal: boolean,
    gradeAluno: any,
  ): Promise<any> {
    let media = 0;
    let descricao = '';
    const anoCorrente = this.anoAtualPrincipal;
    let resultado =
      gradeAluno.CODIGO_ANO_LECTIVO === anoCorrente
        ? EstadoAvaliacaoEnum.PENDENTE
        : EstadoAvaliacaoEnum.REPROVADO;

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

      //====================== Já tem nota não calcula ========================================
      if (
        // gradeAluno.CODIGO_ANO_LECTIVO !== anoCorrente &&
        gradeAluno.EQUIVALENCIA !== 0 &&
        gradeAluno.NOTA !== null &&
        gradeAluno.NOTA !== undefined &&
        Number(gradeAluno.NOTA) > 0
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
          'Média calculada a partir da nota consolidada da grade.',
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

      const temNota = (nota: any): boolean =>
        nota !== null &&
        nota !== undefined &&
        nota.NOTA !== null &&
        nota.NOTA !== undefined;

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
        // A 1ª e a 2ª Frequência são obrigatórias: se ausentes, entram como 0
        // no cálculo (não existe fase de "Exame" substituto — o documento de
        // regras não a prevê).
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

        // Prática (quando em AGUARDA_PRATICA) — média aritmética (1ªFreq + 2ªFreq + Prática) / 3.
        // A Prática é obrigatória: se ausente, entra como 0. Se insuficiente, o
        // Recurso (nota seca) substitui esta média por completo — a Prática não
        // volta a ser considerada no Recurso.
        // Corre antes do Recurso porque não depende dele nem do Exame.
        if (resultado === EstadoAvaliacaoEnum.AGUARDA_PRATICA) {
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
        if (resultado === EstadoAvaliacaoEnum.AGUARDA_ORAL) {
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
          let bloqueado = false;

          if (isPortal) {
            const pg = await this.pagamentoRecursoRegularizado(
              codigoMatricula,
              gradeAluno.CODIGO,
              7,
              gradeAluno.CODIGO_ANO_LECTIVO,
            );
            console.log('PG', pg);

            if (!pg) {
              bloqueado = true;
              resultado = EstadoAvaliacaoEnum.NOTA_BLOQUEADA;
              descricao =
                'O estudante não efectuou o pagamento da Inscrição de Recurso. Nota bloqueada até regularização do pagamento!';
            }
          }

          if (!bloqueado) {
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
          }

          pauta.obs.push(descricao);
          console.log(descricao);
        }

        // Oral de Recurso — média aritmética (Recurso + Oral de Recurso) / 2.
        // A Oral de Recurso é obrigatória: se ausente, entra como 0 e decide já.
        if (resultado === EstadoAvaliacaoEnum.AGUARDA_ORAL_RECURSO) {
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

        media = this.round(
          ((notaEE?.NOTA ?? 0) + (notaOEE?.NOTA ?? 0)) / 2,
        );

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
        pauta.resultado !== EstadoAvaliacaoEnum.PENDENTE &&
        pauta.resultado !== EstadoAvaliacaoEnum.NOTA_BLOQUEADA
      ) {
        pauta.resultado = EstadoAvaliacaoEnum.REPROVADO;
      }

      // Notas individuais
      pauta.nota1f = nota1f?.NOTA?.toString() ?? '';
      pauta.nota2f = nota2f?.NOTA?.toString() ?? '';
      pauta.notaEx = notaEx?.NOTA?.toString() ?? '';
      pauta.notaRec =
        isPortal && pauta.resultado === EstadoAvaliacaoEnum.NOTA_BLOQUEADA
          ? '-'
          : notaRec?.NOTA?.toString();
      pauta.notaPra = notaPra?.NOTA?.toString() ?? '';
      pauta.notaOr = notaOr?.NOTA?.toString() ?? '';
      pauta.notaOrRec = notaOrRec?.NOTA?.toString() ?? '';
      pauta.notaMel = notaMel?.NOTA?.toString() ?? '';
      pauta.notaEE = notaEE?.NOTA?.toString() ?? '';
      pauta.notaOEE = notaOEE?.NOTA?.toString() ?? '';

      const temPrazo = await this.temPrazo(gradeAluno);
      const possuiNotasAlemDa1f = this.notasPosterioresA1fForamLancadas(
        nota2f,
        notaEx,
        notaRec,
        notaPra,
        notaOr,
        notaOrRec,
        notaMel,
        notaEE,
        notaOEE,
      );
      if (temPrazo && !possuiNotasAlemDa1f) {
        pauta.resultado = EstadoAvaliacaoEnum.PENDENTE;
      }

      console.log(resultado);
      console.log(media);
      console.log(descricao);
      console.log('\n');

      return pauta;
    } catch (error) {
      console.log(gradeAluno);
      console.error('----> NÃO FOI POSSÍVEL ACTUALIZAR <-----', error);
      throw error;
    }
  }

  private notasPosterioresA1fForamLancadas(
    nota2f: any,
    notaEx: any,
    notaRec: any,
    notaPra: any,
    notaOr: any,
    notaOrRec: any,
    notaMel: any,
    notaEE: any,
    notaOEE: any,
  ): boolean {
    const temNota = (nota: any): boolean =>
      nota !== null &&
      nota !== undefined &&
      nota.NOTA !== null &&
      nota.NOTA !== undefined;

    return (
      temNota(nota2f) ||
      temNota(notaEx) ||
      temNota(notaRec) ||
      temNota(notaPra) ||
      temNota(notaOr) ||
      temNota(notaOrRec) ||
      temNota(notaMel) ||
      temNota(notaEE) ||
      temNota(notaOEE)
    );
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

  private async temPrazo(gradeAluno: any): Promise<boolean> {
    console.log(
      '--------------------',
      gradeAluno.CODIGO_ANO_LECTIVO,
      this.anoAtualPrincipal,
    );
    if (!(gradeAluno.CODIGO_ANO_LECTIVO == this.anoAtualPrincipal))
      return false;
    const semestreActual = await calcularSemestreByAnoLectivo(
      this.dataSource,
      this.anoAtualPrincipal,
    );
    console.log('entrei aqui', semestreActual);
    if (semestreActual == 2 && gradeAluno.CODIGO_SEMESTRE == 1) return false;
    const prazos = await this.obterPrazo(gradeAluno.CODIGO_SEMESTRE);
    console.log('entrei aqui', prazos);
    return prazos.length > 0;
  }

  private async obterPrazo(semestre): Promise<any[]> {
    const result = await this.dataSource.query(
      `
    SELECT PK_PRAZO
    FROM FK2_MCAL_TB_PRAZO pz
    INNER JOIN FK2_MCAL_TB_TIPO_PRAZO tpz
      ON tpz.PK_TIPO_PRAZO = pz.FK_TIPO_PRAZO
    INNER JOIN FK2_MCAL_TB_TIPO_AVALIACAO av
      ON av.PK_TIPO_AVALIACAO = pz.FK_TIPO_AVALIACAO
    WHERE tpz.SIGLA = 'LN'
      AND pz.FK_SEMESTRE = :1
      AND av.SIGLA IN ('2FE', '2F')
      AND pz.FK_ANO_LECTIVO = :2
      AND SYSDATE BETWEEN pz.DATA_INICIO AND pz.DATA_FIM
      --AND pz.ACTIVE_STATE = 1
    `,
      [semestre, this.anoAtualPrincipal],
    );
    if (!result || result.length == 0) return [];
    return result;
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

  /**
   * Retorna as grades curriculares do aluno (para um ano lectivo/matrícula)
   * que estão duplicadas — isto é, existe mais de uma grade activa com a
   * mesma disciplina (mesmo nome/CODIGO_DISCIPLINA). Útil para identificar
   * quais cadeiras repetidas precisam ser desactivadas.
   */

  async retornarGradesCurricularesDuplicadas(
    anoLectivo: number,
    numeroDeMatricula: number,
    obs: string = '%Migração%',
  ): Promise<any> {
    try {
      const grades = await this.dataSource.query(
        `
          SELECT * FROM (
              SELECT
                  ftgca.CODIGO                              AS codigo,
                  ftgca.CODIGO_GRADE_CURRICULAR             AS codigo_grade_curricular,
                  ftgca.TURMA                               AS turma,
                  ftgca.CODIGO_CONFIRMACAO                  AS codigo_confirmacao,
                  ftgca.CODIGO_MATRICULA                    AS codigo_matricula,
                  ftgca.ESTADO                              AS estado,
                  ftgca.NOTA                                AS nota,
                  ftgca.CREATED_AT                          AS created_at,
                  ftgca.CODIGO_STATUS_GRADE_CURRICULAR      AS codigo_status_grade_curricular,
                  ftgca.CODIGO_ANO_LECTIVO                  AS codigo_ano_lectivo,
                  ftgca.EPOCA                               AS epoca,
                  ftgca.OBSERVACAO                          AS observacao,
                  ftgca.CODIGO_UTILIZADOR                   AS codigo_utilizador,
                  ftgca.UPDATED_AT                          AS updated_at,
                  ftgca.EQUIVALENCIA                        AS equivalencia,
                  ftgca.REF_HORARIO                         AS ref_horario,

                  ftgc.CODIGO_CURSO                         AS codigo_curso,
                  ftgc.CODIGO_DISCIPLINA                    AS codigo_disciplina,
                  ftgc.CODIGO_CLASSE                        AS codigo_classe,
                  ftgc.CODIGO_SEMESTRE                      AS codigo_semestre,
                  ftgc.CODIGO                               AS codigo_grade_curricula,

                  dc.DESIGNACAO                             AS disciplina,
                  cl.DESIGNACAO                             AS classe,
                  sm.DESIGNACAO                             AS semestre,

                  tm.Codigo                                 AS numero_matricula,
                  tp2.Nome_Completo                         AS nome_completo,
                  tc.Designacao                             AS curso,

                  COUNT(*) OVER (
                      PARTITION BY UPPER(TRIM(dc.DESIGNACAO))
                  )                                          AS qtd_duplicadas

              FROM FK2_TB_GRADE_CURRICULAR_ALUNO ftgca
                  LEFT JOIN FK2_TB_GRADE_CURRICULAR ftgc
                      ON ftgc.CODIGO = ftgca.CODIGO_GRADE_CURRICULAR
                  LEFT JOIN FK2_TB_DISCIPLINAS dc
                      ON dc.CODIGO = ftgc.CODIGO_DISCIPLINA
                  LEFT JOIN FK2_TB_CLASSES cl
                      ON cl.CODIGO = ftgc.CODIGO_CLASSE
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

              WHERE 1=1
                  AND ftgca.CODIGO_STATUS_GRADE_CURRICULAR <> 5
                  AND ftgca.CODIGO_MATRICULA = :numeroDeMatricula
                  AND ftgca.CODIGO_ANO_LECTIVO = :anoLectivo
                  AND dc.DESIGNACAO IS NOT NULL
                  AND (
                      ftgca.OBSERVACAO IS NULL
                      OR ftgca.OBSERVACAO NOT LIKE :obs
                  )
          )
          WHERE QTD_DUPLICADAS > 1
          ORDER BY DISCIPLINA ASC, CODIGO ASC
      `,
        {
          anoLectivo,
          numeroDeMatricula,
          obs,
        } as any,
      );

      return lowercaseKeys(grades || []);
    } catch (error: any) {
      console.error('Erro ao buscar grades curriculares duplicadas:', error);
      throw new Error(
        `Falha ao consultar grades curriculares duplicadas: ${error.message}`,
      );
    }
  }

  /**
   * Actualiza o estado de uma grade curricular do aluno (ex: desactivar
   * uma das cadeiras duplicadas). Não apaga o registo, apenas altera o
   * ESTADO (e opcionalmente o CODIGO_STATUS_GRADE_CURRICULAR).
   */
  async atualizarEstadoGradeCurricularAluno(
    codigo: number,
    novoEstado: number,
    codigoUtilizador: number,
    codigoStatusGradeCurricular?: number,
  ): Promise<any> {
    try {
      const result = await this.dataSource.query(
        `
          UPDATE FK2_TB_GRADE_CURRICULAR_ALUNO
             SET ESTADO = :novoEstado,
                 CODIGO_UTILIZADOR = :codigoUtilizador,
                 UPDATED_AT = SYSDATE
                 ${codigoStatusGradeCurricular !== undefined
          ? ', CODIGO_STATUS_GRADE_CURRICULAR = :codigoStatusGradeCurricular'
          : ''
        }
           WHERE CODIGO = :codigo
      `,
        {
          novoEstado,
          codigoUtilizador,
          codigo,
          ...(codigoStatusGradeCurricular !== undefined
            ? { codigoStatusGradeCurricular }
            : {}),
        } as any,
      );

      return result;
    } catch (error: any) {
      console.error('Erro ao actualizar estado da grade curricular:', error);
      throw new Error(
        `Falha ao actualizar estado da grade curricular: ${error.message}`,
      );
    }
  }

  private async pagamentoRecursoRegularizado(
    codigoMatricula: number,
    codigoGradeAluno: number,
    codigoTipoAvaliacao: number,
    codigoAnoLectivo: number,
  ): Promise<boolean> {
    const result = await this.dataSource.query(
      `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_INSCRICAO_AVALIACOES ha
    INNER JOIN FK2_FACTURA ft ON ft.CODIGO = ha.CODIGO_FACTURA
    WHERE ha.CODIGO_MATRICULA     = :matricula
      AND ha.CODIGO_GRADE_ALUNO    = :grade
      AND ha.CODIGO_TIPO_AVALIACAO = :tipo
      AND ha.CODIGO_ANO_LECTIVO    = :ano
      AND ft.ESTADO = 1
    `,
      {
        matricula: codigoMatricula,
        grade: codigoGradeAluno,
        tipo: codigoTipoAvaliacao,
        ano: codigoAnoLectivo,
      } as any,
    );

    const total = Number(result[0]?.TOTAL ?? result[0]?.total ?? 0);
    console.log('TOtal', total);
    return total > 0;
  }

  // async findCurriculum(params: FindCurriculumParams) {
  //   const { academicYearCode, enrollmentCode, semester } = params;
  //   const semesterFilter = semester ? 'AND g.CODIGO_SEMESTRE = :semester' : '';

  //   const sql = `
  //   SELECT DISTINCT
  //     d."DESIGNACAO"              AS "disciplina",
  //     s."DESIGNACAO"              AS "semestre",
  //     c."DESIGNACAO"              AS "classe",
  //     NVL(al."NOTA", 0)           AS "nota",
  //     st."DESIGNACAO"             AS "estado",
  //     dur."DESIGNACAO"            AS "duracaoDisciplina",
  //     d."CODIGO"                  AS "CodigoDisciplina",
  //     g."CODIGO"                  AS "CodigoGrade",
  //     NVL(g."VALOR_INSCRICAO", 0) AS "ValorInscricao",
  //     aaa."DESIGNACAO"            AS "ano_lectivo"
  //   FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
  //   INNER JOIN FK2_TB_GRADE_CURRICULAR g
  //     ON al."CODIGO_GRADE_CURRICULAR" = g."CODIGO"
  //   INNER JOIN FK2_TB_DISCIPLINAS d
  //     ON d."CODIGO" = g."CODIGO_DISCIPLINA"
  //   INNER JOIN FK2_TB_CLASSES c
  //     ON c."CODIGO" = g."CODIGO_CLASSE"
  //   INNER JOIN FK2_TB_DURACAO dur
  //     ON dur."CODIGO" = d."DURACAO"
  //   INNER JOIN FK2_TB_SEMESTRES s
  //     ON g."CODIGO_SEMESTRE" = s."CODIGO"
  //   INNER JOIN FK2_TB_STATUS_GRADE_CURRICULAR st
  //     ON st."CODIGO" = al."CODIGO_STATUS_GRADE_CURRICULAR"
  //   INNER JOIN FK2_TB_CONFIRMACOES ccc
  //     ON ccc."CODIGO" = al."CODIGO_CONFIRMACAO"
  //   INNER JOIN FK2_TB_ANO_LECTIVO aaa
  //     ON aaa."CODIGO" = ccc."CODIGO_ANO_LECTIVO"
  //   WHERE g."STATUS_" = 1
  //     AND al."CODIGO_MATRICULA" = :enrollmentCode
  //     AND al."CODIGO_STATUS_GRADE_CURRICULAR" <> 5
  //     ${semesterFilter}
  //     AND ccc."CODIGO_ANO_LECTIVO" = :academicYearCode
  //     AND c."CODIGO" IS NOT NULL
  // `;

  //   const bindParams = {
  //     enrollmentCode,
  //     academicYearCode,
  //     ...(semester ? { semester } : {}),
  //   };

  //   const grades: StudentCurriculumGradeRow[] = await this.dataSource.query(
  //     sql,
  //     bindParams as any,
  //   );

  //   return { grades };
  // }

  // Ajusta para o código real do tipo de avaliação "Recurso" na tua BD
  private readonly CODIGO_TIPO_AVALIACAO_RECURSO = 7;

  private async statusPagamentoRecurso(
    codigoMatricula: number,
    codigoGradeAluno: number,
    codigoTipoAvaliacao: number,
    codigoAnoLectivo: number,
  ): Promise<{ temInscricao: boolean; pago: boolean }> {
    const result = await this.dataSource.query(
      `
    SELECT
      COUNT(*) AS TOTAL,
      SUM(CASE WHEN ft.ESTADO = 1 THEN 1 ELSE 0 END) AS PAGOS
    FROM FK2_INSCRICAO_AVALIACOES ha
    INNER JOIN FK2_FACTURA ft ON ft.CODIGO = ha.CODIGO_FACTURA
    WHERE ha.CODIGO_MATRICULA     = :matricula
      AND ha.CODIGO_GRADE_ALUNO    = :grade
      AND ha.CODIGO_TIPO_AVALIACAO = :tipo
      AND ha.CODIGO_ANO_LECTIVO    = :ano
    `,
      {
        matricula: codigoMatricula,
        grade: codigoGradeAluno,
        tipo: codigoTipoAvaliacao,
        ano: codigoAnoLectivo,
      } as any,
    );

    const total = Number(result[0]?.TOTAL ?? result[0]?.total ?? 0);
    const pagos = Number(result[0]?.PAGOS ?? result[0]?.pagos ?? 0);

    return { temInscricao: total > 0, pago: pagos > 0 };
  }

  async findCurriculum(params: FindCurriculumParams) {
    const { academicYearCode, enrollmentCode, semester } = params;
    const semesterFilter = semester ? 'AND g.CODIGO_SEMESTRE = :semester' : '';

    const sql = `
    SELECT DISTINCT
      d."DESIGNACAO"              AS "disciplina",
      s."DESIGNACAO"              AS "semestre",
      c."DESIGNACAO"              AS "classe",
      NVL(al."NOTA", 0)           AS "nota",
      st."DESIGNACAO"             AS "estado",
      dur."DESIGNACAO"            AS "duracaoDisciplina",
      d."CODIGO"                  AS "CodigoDisciplina",
      g."CODIGO"                  AS "CodigoGrade",
      al."CODIGO"                 AS "CodigoGradeAluno",
      NVL(g."VALOR_INSCRICAO", 0) AS "ValorInscricao",
      aaa."DESIGNACAO"            AS "ano_lectivo"
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
    INNER JOIN FK2_TB_GRADE_CURRICULAR g
      ON al."CODIGO_GRADE_CURRICULAR" = g."CODIGO"
    INNER JOIN FK2_TB_DISCIPLINAS d
      ON d."CODIGO" = g."CODIGO_DISCIPLINA"
    INNER JOIN FK2_TB_CLASSES c
      ON c."CODIGO" = g."CODIGO_CLASSE"
    INNER JOIN FK2_TB_DURACAO dur
      ON dur."CODIGO" = d."DURACAO"
    INNER JOIN FK2_TB_SEMESTRES s
      ON g."CODIGO_SEMESTRE" = s."CODIGO"
    INNER JOIN FK2_TB_STATUS_GRADE_CURRICULAR st
      ON st."CODIGO" = al."CODIGO_STATUS_GRADE_CURRICULAR"
    INNER JOIN FK2_TB_CONFIRMACOES ccc
      ON ccc."CODIGO" = al."CODIGO_CONFIRMACAO"
    INNER JOIN FK2_TB_ANO_LECTIVO aaa
      ON aaa."CODIGO" = ccc."CODIGO_ANO_LECTIVO"
    WHERE g."STATUS_" = 1
      AND al."CODIGO_MATRICULA" = :enrollmentCode
      AND al."CODIGO_STATUS_GRADE_CURRICULAR" <> 5
      ${semesterFilter}
      AND ccc."CODIGO_ANO_LECTIVO" = :academicYearCode
      AND c."CODIGO" IS NOT NULL
  `;

    const bindParams = {
      enrollmentCode,
      academicYearCode,
      ...(semester ? { semester } : {}),
    };

    const rows: (StudentCurriculumGradeRow & { CodigoGradeAluno: number })[] =
      await this.dataSource.query(sql, bindParams as any);

    const grades = await Promise.all(
      rows.map(async (row) => {
        const { temInscricao, pago } = await this.statusPagamentoRecurso(
          enrollmentCode,
          row.CodigoGradeAluno,
          this.CODIGO_TIPO_AVALIACAO_RECURSO,
          academicYearCode,
        );

        return {
          ...row,
          nota: temInscricao && !pago ? '-' : row.nota,
        };
      }),
    );

    return { grades };
  }
}
