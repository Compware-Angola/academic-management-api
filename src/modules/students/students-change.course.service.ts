import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateStudentEnrollmentUC } from './dto/create-student-enrollment-uc';
import { STATUS_GRADE } from '../common/enums/status.grade';
import { ChangeCourseDTO } from './dto/change-course.dto';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { SERVICE_SIGLA } from '../common/enums/service.sigla';
import { promises } from 'dns';

interface RegistrarMotivoParams {
  codigoMatricula: number;
  cursoAnterior: number;
  cursoSelecionado: number;
  codigoUtilizador: number;
}
interface BuscarGradeCurricularEquivalentesParams {
  codigoMatricula: number;
  cursoAnterior: number;
  cursoSelecionado: number;
}
interface GradeCurricularEquivalenteDTO {
  disciplina: string;
  codigo_grade: number;
  nota: number;
  codigo_grade_equivalente: number;
  codigo_grade_curricular_aluno: number;
}
@Injectable()
export class StudentsEnrollmentUCService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly anoLectivoUtil: AnoLectivoUtil,
  ) {}
  private async getMatriculaDetails(codigoMatricula: number) {
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

    const result = await this.dataSource.query(sql, {
      codigoMatricula,
      anoLectivoId,
    } as any);
    return result && result.length > 0;
  }

  async chaneCourse(dto: ChangeCourseDTO) {
    const { PoloId, cursoId, matriculaId } = dto;
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
      confirmationExists || matriculaDetails.estado.toLowerCase() === 'activo';

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
        'Erro não pode-se mudar o curso por falta de pagamento ou não é novo aluno',
      );
    }
    await this.registrarMotivo({
      codigoMatricula: matriculaId,
      codigoUtilizador: 1,
      cursoAnterior: matriculaDetails.codigo_curso,
      cursoSelecionado: cursoId!,
    });
  }

  private async temIsencao(codigoMatricula: number) {
    const anoCorrente = await this.anoLectivoUtil.getAnoAtualId();
    const sql = `
    select CODIGO
    from FK2_TB_ISENCOES i
    inner join FK2_TB_TIPO_SERVICOS s
    on s.CODIGO = i.CODIGO_SERVICO
    where 1=1
    and i.CODIGO_ANOLECTIVO = codigoAnoLectivo
    and UPPER (i.ESTADO_ISENSAO) = 'ACTIVO'
    AND I.CODIGO_MATRICULA = :codigoMatricula
    and s.sigla = :sigla
    `;
    const result = await this.dataSource.query(sql, {
      sigla: SERVICE_SIGLA.CAMDCI,
      codigoMatricula: codigoMatricula,
      codigoAnoLectivo: anoCorrente,
    } as any);
    return !result || result.length;
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
    const result = await this.dataSource.query(sql, {
      sigla: SERVICE_SIGLA.CAMDCI,
      codigoAnoLectivo: anoCorrente,
      codigoMatricula: codigoMatricula,
    } as any);

    return !result || result.length;
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
    const result = await this.dataSource.query(sql, {
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
      await this.dataSource.query(sql, {
        codigoMatricula: codigoMatricula,
        codigoUtilizador: codigoUtilizador,
        codigoCursoAnterior: cursoAnterior,
        codigoCursoNovo: cursoSelecionado,
      } as any);
    } catch (error) {
      throw new BadRequestException('Erro ao tentar registrar motivo');
    }
  }
  private async carregarNovasGradeCurricularPrimeiroAno(codigoCurso: number) {
    const sql = `
    select
      codigo_disciplina,
      codigo_classe,
      codigo_semestre
    from FK2_TB_GRADE_CURRICULAR g
    inner join FK2_TB_PLANO_CURRICULAR_GRADE pcg
      on pcg.CODIGO_GRADE_CURRICULAR = g.CODIGO
    inner join FK2_TB_PLANO_CURRICULAR_CURSO pcc
      on pcc.CODIGO = pcg.CODIGO_PLANO_CURRICULAR_CURSO
    and g.status_ = 1
    and g.codigo_classe = 1
    and g.codigo_curso = :codigoCurso
    `;
    const result = await this.dataSource.query(sql, {
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
                al.Codigo                  AS codigo_grade_curricular_aluno
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
    const result = await this.dataSource.query(sql, {
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
  ) {
    //Desativar todas as grades anteriores do curso
    const ids = params.map((p) => p.codigo_grade_curricular_aluno);
    if (!ids.length) return;
    const idsParams = ids.join(',');

    const sql = `
    update fk2_tb_grade_curricular_aluno
    set codigo_status_grade_curricular = ${STATUS_GRADE.ELIMINADO},
        estado = 3,
        observacao = :observacao
    where 1=1
    and codigo_matricula
    and codigo not in (${idsParams})
    `;
    await this.dataSource.query(sql, {
      observacao: '"Eliminado Durante a Alteração de Curso',
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
          and codigo := codigo_grade_curricular_aluno
      `;
      try {
        await this.dataSource.query(sql, {
          codigo_grade_equivalente: gradeEquivilante.codigo_grade_equivalente,
          observacao: 'Mantida Por Equivalência Durante a Mudança de Curso',
          codigo_grade_curricular_aluno:
            gradeEquivilante.codigo_grade_curricular_aluno,
        } as any);
      } catch (error) {}
    }
  }
}
