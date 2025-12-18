import { Injectable } from '@nestjs/common';
import { FilterCurriculumGradeAlunoDto } from './dto/filter-student-curriculum.dto';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

@Injectable()
export class HistoryNoteReleaseService {
  constructor(private readonly dataSource: DataSource) {}


     async searchcurricularByRegistrationNumberAndAcademicYear(params:FilterCurriculumGradeAlunoDto){

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


}
