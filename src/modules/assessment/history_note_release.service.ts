import { Injectable, BadRequestException } from '@nestjs/common';
import { FilterCurriculumGradeAlunoDto } from './dto/filter-student-curriculum.dto';
import { HistoryNoteReleaseDto } from './dto/history_note_release.dto';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

@Injectable()
export class HistoryNoteReleaseService {
  constructor(private readonly dataSource: DataSource) { }

  async searchCurricularByStudenty(params: FilterCurriculumGradeAlunoDto) {
    return this.searchCurricularByRegistrationNumberAndAcademicYear(params)
  }

  /**
   * Busca todas as disciplinas do aluno por matrícula e ano letivo
   */
  private async searchCurricularByRegistrationNumberAndAcademicYear(
    params: FilterCurriculumGradeAlunoDto,
  ): Promise<any[]> {
    const { codigoAnoLectivo, codigoMatricula } = params;

    const sql = `
      SELECT DISTINCT
        gca.CODIGO AS codigo_grade_curricular_aluno,
        gca.CODIGO_GRADE_CURRICULAR,
        gca.CODIGO_MATRICULA,
       
        gca.CREATED_AT,

        td.DESIGNACAO AS designacao_disciplina
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO gca
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc ON tgc.CODIGO = gca.CODIGO_GRADE_CURRICULAR
      INNER JOIN FK2_TB_DISCIPLINAS td ON td.CODIGO = tgc.CODIGO_DISCIPLINA
      WHERE gca.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
        AND gca.CODIGO_MATRICULA = :codigoMatricula
      ORDER BY td.DESIGNACAO
    `;

    const resultados = await this.dataSource.query(sql, [
      codigoAnoLectivo,
      codigoMatricula,
    ]);

    return toLowerCaseKeys(resultados);
  }

  /**
   * Busca o histórico de lançamentos de notas para uma única inscrição na disciplina
   */
  private async getReleaseHistory(codigoGradeCurricularAluno: number): Promise<any[]> {
    const sql = `
      SELECT 
        tm.CODIGO AS matricula,
        tp.NOME_COMPLETO AS nome,
        td.DESIGNACAO AS grade,
        tgcaab.NOTA AS nota_lancada,
        tgcaab.CREATED_AT AS datalancada,
        tgcaab.CODIGO AS Codigo,
        tta.DESIGNACAO AS tipo_avaliacao,
        tp2.NOME_COMPLETO AS utilizador
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES tgcaab 
      LEFT JOIN FK2_TB_TIPO_AVALIACAO tta
      ON tgcaab.TIPO_AVALIACAO = tta.CODIGO
      INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca 
        ON tgca.CODIGO = tgcaab.GRADE_CURRICULAR_ALUNO 
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc 
        ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR 
      LEFT JOIN FK2_MCA_TB_UTILIZADOR mtu 
        ON mtu.PK_UTILIZADOR = JSON_VALUE(tgcaab.REF_UTILIZADOR, '$.pk')
      LEFT JOIN FK2_TB_PESSOA tp2 
        ON tp2.PK_PESSOA = JSON_VALUE(mtu.REF_PESSOA, '$.pk')
      INNER JOIN FK2_TB_DISCIPLINAS td 
        ON td.CODIGO = tgc.CODIGO_DISCIPLINA 
      INNER JOIN FK2_TB_MATRICULAS tm 
        ON tm.CODIGO = tgca.CODIGO_MATRICULA 
      INNER JOIN FK2_TB_ADMISSAO ta 
        ON ta.CODIGO = tm.CODIGO_ALUNO 
      INNER JOIN FK2_TB_PREINSCRICAO tp 
        ON tp.CODIGO = ta.PRE_INCRICAO 
      WHERE tgcaab.GRADE_CURRICULAR_ALUNO = :codigoGradeCurricularAluno
      ORDER BY tgcaab.CREATED_AT DESC
    `;

    const resultados = await this.dataSource.query(sql, [codigoGradeCurricularAluno]);
    return toLowerCaseKeys(resultados);
  }

  /**
   * Método principal: retorna histórico de notas
   * - Se passar codigo_grade_curricular_aluno → histórico de uma única disciplina
   * - Senão → histórico de TODAS as disciplinas do aluno no ano/matricula
   */
  async historyNoteRelease(params: HistoryNoteReleaseDto): Promise<any[]> {
    const { codigoAnoLectivo, codigoMatricula, codigo_grade_curricular_aluno } = params;

    // Caso 1: Busca apenas uma disciplina específica (mantemos a query otimizada original)
    if (codigo_grade_curricular_aluno) {
      const registros = await this.getReleaseHistory(codigo_grade_curricular_aluno);
      return toLowerCaseKeys(registros);
    }

    // Caso 2: Todas as disciplinas do aluno → validação
    if (!codigoAnoLectivo || !codigoMatricula) {
      throw new BadRequestException(
        'codigoAnoLectivo e codigoMatricula são obrigatórios quando não informado codigo_grade_curricular_aluno',
      );
    }

    // Query ÚNICA que traz o histórico de TODAS as disciplinas do aluno no ano/matricula
    const sql = `
    SELECT 
      tm.CODIGO AS matricula,
      tp.NOME_COMPLETO AS nome,
      td.DESIGNACAO AS grade,
      tgcaab.NOTA AS nota_lancada,
      tgcaab.CREATED_AT AS datalancada,
      tgcaab.CODIGO AS Codigo,
      tta.DESIGNACAO AS tipo_avaliacao,
      mtu.NOME AS utilizador
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES tgcaab 
    INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca 
      ON tgca.CODIGO = tgcaab.GRADE_CURRICULAR_ALUNO 
      LEFT JOIN FK2_TB_TIPO_AVALIACAO tta
      ON tgcaab.TIPO_AVALIACAO = tta.CODIGO
    INNER JOIN FK2_TB_GRADE_CURRICULAR tgc 
      ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR 
    LEFT JOIN FK2_MCA_TB_UTILIZADOR mtu 
      ON mtu.CODIGO = JSON_VALUE(tgcaab.REF_UTILIZADOR, '$.pk')
    LEFT JOIN FK2_TB_PESSOA tp2 
      ON tp2.PK_PESSOA = JSON_VALUE(mtu.REF_PESSOA, '$.pk')
    INNER JOIN FK2_TB_DISCIPLINAS td 
      ON td.CODIGO = tgc.CODIGO_DISCIPLINA 
    INNER JOIN FK2_TB_MATRICULAS tm 
      ON tm.CODIGO = tgca.CODIGO_MATRICULA 
    INNER JOIN FK2_TB_ADMISSAO ta 
      ON ta.CODIGO = tm.CODIGO_ALUNO 
    INNER JOIN FK2_TB_PREINSCRICAO tp 
      ON tp.CODIGO = ta.PRE_INCRICAO 
    WHERE tgca.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
      AND tgca.CODIGO_MATRICULA = :codigoMatricula
    ORDER BY tgcaab.CREATED_AT DESC
  `;

    const resultados = await this.dataSource.query(sql, [
      codigoAnoLectivo,
      codigoMatricula,
    ]);

    if (resultados.length === 0) {
      return [];
    }

    return toLowerCaseKeys(resultados);
  }
}