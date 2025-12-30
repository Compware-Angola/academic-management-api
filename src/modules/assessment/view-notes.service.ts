import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FetchViewNotesDTO } from './dto/fetch-view-notes.dto';

@Injectable()
export class ViewNotesService {
  constructor(private readonly dataSource: DataSource) {}
  async findNoteByHorario({
    tipoConsulta,
    gradeId,
    tipoAvaliacao,
    tipoProva,
    horarioOrTurmaId,
    anoLectivo,
    limit = 25,
    page = 1,
  }: FetchViewNotesDTO) {
    const offset = (page - 1) * limit;

    const whereCommon = `
      fk2_tb_matriculas.estado_matricula IN ('concluido', 'diplomado', 'activo', 'inactivo')
      AND fk2_tb_grade_curricular_aluno.Codigo_Status_Grade_Curricular IN (2, 3)
      AND fk2_tb_grade_curricular_aluno.codigo_ano_lectivo = ${anoLectivo}
    `;
    const whereSpecific =
      tipoConsulta === 1
        ? `
        JSON_VALUE(fk2_tb_grade_curricular_aluno.ref_horario, '$.pk') = ${horarioOrTurmaId}
      `
        : `
        fk2_tb_grade_curricular_aluno.turma = ${horarioOrTurmaId}
        AND fk2_tb_grade_curricular_aluno.codigo_grade_curricular = ${gradeId}
      `;
    const baseWhere = `${whereCommon} AND ${whereSpecific}`;

    const sql = `
    SELECT
      fk2_tb_grade_curricular_aluno.codigo                                         AS CODIGO_GRADE,
      fk2_tb_matriculas.Codigo                                                     AS NUMERO_MATRICULA,
      fk2_tb_preinscricao.Nome_Completo                                            AS NOME_COMPLETO,
      fk2_tb_grade_curricular_aluno_avaliacoes.codigo                              AS AVALIACAO,
      fk2_tb_grade_curricular_aluno_avaliacoes.status_                             AS STATUS,
      fk2_tb_grade_curricular_aluno_avaliacoes.observacao                          AS OBSERVACAO,
      fk2_tb_grade_curricular_aluno_avaliacoes.nota                                AS NOTA,
       av.designacao                                                               AS DESCRICAO_AVALIACAO,
      MIN(fk2_tb_grade_curricular_aluno_avaliacoes.created_at)                     AS DATA_LANCAMENTO,
      MIN(fk2_tb_grade_curricular_aluno_avaliacoes.update_at)                      AS DATA_ATUALIZACAO,
      TO_CHAR(MIN(fk2_tb_grade_curricular_aluno_avaliacoes.update_at), 'HH24')     AS HORA,
      TO_CHAR(MIN(fk2_tb_grade_curricular_aluno_avaliacoes.update_at), 'MI')       AS MINUTO,
      TO_CHAR(MIN(fk2_tb_grade_curricular_aluno_avaliacoes.created_at), 'HH24')    AS HORA_CRIACAO,
      TO_CHAR(MIN(fk2_tb_grade_curricular_aluno_avaliacoes.created_at), 'MI')      AS MINUTO_CRIACAO,
      JSON_VALUE(
        fk2_tb_grade_curricular_aluno_avaliacoes.ref_utilizador,
        '$.desc'
      )                                                                            AS NOME_DOCENTE
    FROM fk2_tb_grade_curricular_aluno
      LEFT JOIN fk2_tb_grade_curricular_aluno_avaliacoes
        ON fk2_tb_grade_curricular_aluno_avaliacoes.grade_curricular_aluno = fk2_tb_grade_curricular_aluno.codigo
        AND fk2_tb_grade_curricular_aluno_avaliacoes.codigo IS NOT NULL
        AND fk2_tb_grade_curricular_aluno_avaliacoes.tipo_avaliacao = ${tipoAvaliacao}
        AND fk2_tb_grade_curricular_aluno_avaliacoes.tipo_de_prova = ${tipoProva}
      INNER JOIN fk2_tb_matriculas
        ON fk2_tb_matriculas.Codigo = fk2_tb_grade_curricular_aluno.codigo_matricula
      INNER JOIN fk2_tb_admissao
        ON fk2_tb_admissao.codigo = fk2_tb_matriculas.Codigo_Aluno
      INNER JOIN fk2_tb_preinscricao
        ON fk2_tb_preinscricao.Codigo = fk2_tb_admissao.pre_incricao
      LEFT JOIN FK2_MCAL_TB_TIPO_AVALIACAO av on av.PK_TIPO_AVALIACAO = fk2_tb_grade_curricular_aluno_avaliacoes.tipo_avaliacao
      LEFT JOIN fk2_mca_tb_utilizador tu
        ON tu.pk_utilizador = JSON_VALUE(
          fk2_tb_grade_curricular_aluno_avaliacoes.ref_utilizador,
          '$.pk'
        )
    WHERE ${baseWhere}
    GROUP BY
      fk2_tb_grade_curricular_aluno.codigo,
      fk2_tb_matriculas.Codigo,
      fk2_tb_preinscricao.Nome_Completo,
      fk2_tb_grade_curricular_aluno_avaliacoes.codigo,
      fk2_tb_grade_curricular_aluno_avaliacoes.status_,
      fk2_tb_grade_curricular_aluno_avaliacoes.observacao,
      fk2_tb_grade_curricular_aluno_avaliacoes.nota,
      av.designacao,
      JSON_VALUE(fk2_tb_grade_curricular_aluno_avaliacoes.ref_utilizador, '$.desc')
    ORDER BY fk2_tb_preinscricao.Nome_Completo ASC
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    const sqlCount = `
    SELECT COUNT(*) AS TOTAL
    FROM (
      SELECT fk2_tb_grade_curricular_aluno.codigo
      FROM fk2_tb_grade_curricular_aluno
        INNER JOIN fk2_tb_matriculas
          ON fk2_tb_matriculas.Codigo = fk2_tb_grade_curricular_aluno.codigo_matricula
      WHERE ${baseWhere}
      GROUP BY fk2_tb_grade_curricular_aluno.codigo
    )
  `;

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql),
      this.dataSource.query(sqlCount),
    ]);

    const total = Number(countResult[0].TOTAL);
    const totalPages = Math.ceil(total / limit);

    return {
      data: await toLowerCaseKeys(result),
      total,
      page,
      limit,
      totalPages,
    };
  }
}
