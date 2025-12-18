import { Injectable } from '@nestjs/common';
import { FilterCurriculumGradeAlunoDto } from './dto/filter-student-curriculum.dto';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { HistoryNoteReleaseDto } from './dto/history_note_release.dto';

@Injectable()
export class HistoryNoteReleaseService {
    constructor(private readonly dataSource: DataSource) { }


    async searchcurricularByRegistrationNumberAndAcademicYear(params: FilterCurriculumGradeAlunoDto) {
        const { codigoAnoLectivo, codigoMatricula } = params;

        const sql = `
    SELECT DISTINCT
      gca.CODIGO    AS CODIGO_GRADE_CURRICULAR_ALUNO ,
      gca.CODIGO_GRADE_CURRICULAR,
      gca.CODIGO_MATRICULA,
      gca.ESTADO,
      gca.NOTA,
      gca.CREATED_AT,
      gca.USER_ID,
      gca.CANAL,
      gca.CODIGO_STATUS_GRADE_CURRICULAR,
      gca.CODIGO_ANO_LECTIVO,
      td.DESIGNACAO
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

        return await toLowerCaseKeys(resultados)
    }

    async history_note_release(params: HistoryNoteReleaseDto) {
        const { codigoAnoLectivo, codigoMatricula, codigo_grade_curricular_aluno } = params


        if (codigo_grade_curricular_aluno) {
            const sql = `
            SELECT 
    tm.Codigo AS matricula,
    tp.Nome_Completo AS nome,
    td.Designacao AS grade,
    tgcaab.nota AS nota_lancada,
    tgcaab.created_at AS dataLancada,
    tp2.NOME_COMPLETO  AS utilizador
FROM FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES tgcaab 
INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca 
    ON tgca.CODIGO = tgcaab.GRADE_CURRICULAR_ALUNO 
INNER JOIN FK2_TB_GRADE_CURRICULAR tgc 
    ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR 
LEFT JOIN FK2_MCA_TB_UTILIZADOR  mtu 
    ON mtu.CODIGO  =  JSON_VALUE(tgcaab.REF_UTILIZADOR,'$.pk' )
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
WHERE tgcaab.GRADE_CURRICULAR_ALUNO = 1481063
ORDER BY tgcaab.created_at DESC;
            `

            const resultados = await this.dataSource.query(sql, [
                codigoAnoLectivo,
                codigoMatricula,
            ]);

        }







    }


}
