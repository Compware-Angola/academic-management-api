import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';


@Injectable()
export class TeamOldRulesService {
  constructor(private readonly dataSource: DataSource,) { }

async findAllUnidadeCurricular(
  codigoTurma: number,
  codigoAnoLectivo: number,
  codigoSemestre?: number
) {
  const params: any = {
    turma: codigoTurma,
    anoLectivo: codigoAnoLectivo
  };

  let whereExtra = '';
  if (codigoSemestre !== undefined && codigoSemestre !== null && codigoSemestre !== 0) {
    whereExtra = ` AND sem.CODIGO = :semestre`;
    params['semestre'] = codigoSemestre;
  }

  const query = `
    SELECT DISTINCT
      al.CODIGO    AS code_ano_lectivo,
      g.CODIGO     AS grade_curricular,
      d.DESIGNACAO AS unidade_curricular
    FROM FK2_TB_DOCENTE_DISCIPLINAS dd              
      INNER JOIN FK2_TB_GRADE_CURRICULAR g          
        ON g.CODIGO = dd.CODIGO_DISCIPLINA
      INNER JOIN FK2_TB_DISCIPLINAS d               
        ON d.CODIGO = g.CODIGO_DISCIPLINA
      INNER JOIN FK2_TB_PLANO_CURRICULAR_GRADE pg   
        ON pg.CODIGO_GRADE_CURRICULAR = g.CODIGO
      INNER JOIN FK2_TB_SEMESTRES sem 
        ON sem.CODIGO = g.CODIGO_SEMESTRE 
      INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO pc   
        ON pc.CODIGO = pg.CODIGO_PLANO_CURRICULAR_CURSO
      INNER JOIN FK2_TB_ANO_LECTIVO al               
        ON al.CODIGO = pc.CODIGO_ANO_LECTIVO
      INNER JOIN FK2_TB_TURMAS t                   
        ON t.CODIGO = dd.TURMA 
    WHERE t.CODIGO = :turma
      AND al.CODIGO = :anoLectivo
      ${whereExtra}
    ORDER BY d.DESIGNACAO
  `;

  const result = await this.dataSource.query(query, params);

  return toLowerCaseKeys(result);
}
async findAll(filters: {
    anoLectivo?: number;
    classe?: number;
    curso?: number;
    periodo?: number;
  }) {
    const { anoLectivo, classe, curso, periodo } = filters;

    const params: any = {};
    const conditions: string[] = [];

    if (anoLectivo !== undefined && anoLectivo !== null) {
      conditions.push('t.CODIGO_ANOLECTIVO = :anoLectivo');
      params.anoLectivo = anoLectivo;
    }

    if (classe !== undefined && classe !== null) {
      conditions.push('t.CODIGO_CLASSE = :classe');
      params.classe = classe;
    }

    if (curso !== undefined && curso !== null) {
      conditions.push('t.CODIGO_CURSO = :curso');
      params.curso = curso;
    }

    if (periodo !== undefined && periodo !== null) {
      conditions.push('t.CODIGO_PERIODO = :periodo');
      params.periodo = periodo;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const query = `
      SELECT 
        t.CODIGO,
        t.DESIGNACAO
      FROM FK2_TB_TURMAS t
      ${whereClause}
      ORDER BY t.DESIGNACAO ASC
    `;

    const result = await this.dataSource.query(query, params);

     return await toLowerCaseKeys(result);

  }
}
