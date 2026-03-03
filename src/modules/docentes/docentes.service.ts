import { Injectable, NotFoundException } from '@nestjs/common';

import { DataSource } from 'typeorm';
import { CreateProgramaUCDTO, FindProgramaUCDTO } from './dto/find-programa-uc.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FindProgramaSemUCDTO } from './dto/find-programa-sem-uc.dto';


@Injectable()
export class DocentesService {
  constructor(private readonly dataSource: DataSource) {}
async createProgramaUC(data: CreateProgramaUCDTO) {

  const [academicYear, semestre, docente, gradeCurricular] = await Promise.all([
    this.dataSource.createQueryBuilder()
      .select('CODIGO, DESIGNACAO').from('FK2_TB_ANO_LECTIVO', 'ano_lectivo')
      .where('CODIGO = :anoLectivo', { anoLectivo: data.anoLectivo })
      .getRawOne(),

    this.dataSource.createQueryBuilder()
      .select('*').from('FK2_TB_SEMESTRES', 'semestre')
      .where('CODIGO = :semestre', { semestre: data.semestre })
      .getRawOne(),

    this.dataSource.createQueryBuilder()
      .select('CODIGO, CODIGO_UTILIZADOR').from('FK2_MGD_TB_DOCENTE', 'docente')
      .where('CODIGO = :docenteId', { docenteId: data.docenteCode })
      .getRawOne(),

    this.dataSource.createQueryBuilder()
  .select([
    'GRADE.CODIGO AS CODIGO',
    'DISC.DESIGNACAO AS DESIGNACAO',
  ])
  .from('FK2_TB_GRADE_CURRICULAR', 'GRADE')
  .innerJoin(
    'FK2_TB_DISCIPLINAS',
    'DISC',
    'DISC.CODIGO = GRADE.CODIGO_DISCIPLINA',
  )
  .where('GRADE.CODIGO = :gradeCurricularId', {
    gradeCurricularId: data.gradeCurricularCode,
  })
  .getRawOne(),
  ]);

 
  if (!academicYear) {
    throw new NotFoundException('Ano lectivo não encontrado');
  }

  if (!semestre) {
    throw new NotFoundException('Semestre não encontrado');
  }

  if (!docente) {
    throw new NotFoundException('Docente não encontrado');
  }

  if (!gradeCurricular) {
    throw new NotFoundException('Grade curricular não encontrada');
  }

  const refAnoLectivo = this.gernerateRefAnoLectivo(toLowerCaseKeys(academicYear));
  const refDocente = this.generateRefDocente(toLowerCaseKeys(docente));
  const refGradeCurricular = this.generateRefGradeCurricular(toLowerCaseKeys(gradeCurricular));
 
  return {
    message: 'Dados validados com sucesso',
    refAnoLectivo,
    semestre: toLowerCaseKeys(semestre),
    refDocente,
    refGradeCurricular
  };
}

async findProgramaUC(filters: FindProgramaUCDTO) {
  const {
    anoCurricular,
    anoLectivo,
    codigoCurso,
    semestre,
    docenteId,
    limit = 10,
    page = 1,
  } = filters;

  const offset = (page - 1) * limit;

const conditions: string[] = [];
const params: any = {};

conditions.push(`JSON_VALUE(mtpu.ref_ano_lectivo, '$.pk') = :anoLectivo`);
params.anoLectivo = anoLectivo;

conditions.push(`tgc.codigo_classe = :anoCurricular`);
params.anoCurricular = anoCurricular;

conditions.push(`tgc.codigo_semestre = :semestre`);
params.semestre = semestre;

conditions.push(`tgc.codigo_curso = :codigoCurso`);
params.codigoCurso = codigoCurso;

if (docenteId) {
  conditions.push(`JSON_VALUE(mtpu.ref_docente, '$.pk') = :docenteId`);
  params.docenteId = docenteId;
}

const whereClause = conditions.join(' AND ');

const sql = `
  SELECT
    mtpu.pk_programa                                   AS codigo,
    JSON_VALUE(mtpu.ref_ano_lectivo,'$.desc')          AS anoLectivo,
    JSON_VALUE(mtpu.ref_docente,'$.desc')              AS docente,
    JSON_VALUE(mtpu.ref_grade_curricular, '$.desc')    AS gradeCurricular,
    mtpu.fk_estado_programa                            AS estado,
    mtpu.created_at                                    AS dataCriacao,
    mtpu.updated_at                                    AS dataActualizacao,
    mtpu.ficheiro_name                                 AS arquivo
  FROM FK2_MGD_TB_PROGRAMA_UC mtpu
  INNER JOIN fk2_tb_grade_curricular tgc
    ON tgc.codigo = JSON_VALUE(mtpu.ref_grade_curricular, '$.pk')
  WHERE ${whereClause}
  ORDER BY mtpu.created_at DESC
  OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
`;

const sqlParams = {
  ...params,
  offset,
  limit,
};

const sqlCount = `
  SELECT COUNT(*) AS TOTAL
  FROM FK2_MGD_TB_PROGRAMA_UC mtpu
  INNER JOIN fk2_tb_grade_curricular tgc
    ON tgc.codigo = JSON_VALUE(mtpu.ref_grade_curricular, '$.pk')
  WHERE ${whereClause}
`;

const [result, countResult] = await Promise.all([
  this.dataSource.query(sql, sqlParams),
  this.dataSource.query(sqlCount, params), 
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
async findSemProgramaUC(filters: FindProgramaSemUCDTO) {
    const {
      anoLectivo,
      codigoCurso,
      anoCurricular,
      semestre,
      page = 1,
      limit = 100,
    } = filters;

    const offset = (page - 1) * limit;

    const baseWhere = `
    g.codigo NOT IN (
      SELECT JSON_VALUE(mtpu.ref_grade_curricular, '$.pk')
      FROM FK2_MGD_TB_PROGRAMA_UC mtpu
      WHERE JSON_VALUE(mtpu.ref_ano_lectivo, '$.pk') = ${anoLectivo}
    )
    AND g.codigo_curso = ${codigoCurso}
    AND g.codigo_classe = ${anoCurricular}
    AND g.codigo_semestre = ${semestre}
    AND g.status_ = 1
  `;

    const sql = `
    SELECT DISTINCT
      g.codigo                AS codigo,
      d.designacao            AS disciplina,
      s.designacao            AS semestre,
      c.designacao            AS curso
    FROM FK2_TB_GRADE_CURRICULAR g
    INNER JOIN FK2_TB_CURSOS c
      ON c.codigo = g.codigo_curso
    INNER JOIN FK2_MCAL_TB_SEMESTRE s
      ON s.pk_semestre = g.codigo_semestre
    INNER JOIN FK2_TB_DISCIPLINAS d
      ON d.codigo = g.codigo_disciplina
    WHERE ${baseWhere}
    ORDER BY g.codigo ASC
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `;

    const sqlCount = `
    SELECT COUNT(DISTINCT g.codigo) AS TOTAL
    FROM FK2_TB_GRADE_CURRICULAR g
    INNER JOIN FK2_TB_CURSOS c
      ON c.codigo = g.codigo_curso
    INNER JOIN FK2_MCAL_TB_SEMESTRE s
      ON s.pk_semestre = g.codigo_semestre
    INNER JOIN FK2_TB_DISCIPLINAS d
      ON d.codigo = g.codigo_disciplina
    WHERE ${baseWhere}
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

async findCursos(docenteId:string) {
    const sql = `
           SELECT DISTINCT
       c.codigo,
       c.designacao
FROM fk2_mgd_tb_docente_afectacao mtda
INNER JOIN FK2_TB_GRADE_CURRICULAR g 
        ON g.codigo = JSON_VALUE(mtda.REF_CADEIRA, '$.pk')
INNER JOIN FK2_TB_CURSOS c 
        ON c.codigo = g.CODIGO_CURSO
WHERE JSON_VALUE(mtda.REF_DOCENTE, '$.pk') = :docenteId
  `;

    const result = await this.dataSource.query(sql, [docenteId]);

    return {
      data: toLowerCaseKeys(result),
    };
   }

async findCadeiras(filters: { docenteId: string; cursoId: string, classeId: string }) {
    const { docenteId, cursoId, classeId } = filters;

    const sql = `
    SELECT DISTINCT
       g.codigo,
       JSON_VALUE(mtda.REF_CADEIRA, '$.desc') AS nome_cadeira,
       g.CODIGO_CLASSE
FROM fk2_mgd_tb_docente_afectacao mtda
INNER JOIN FK2_TB_GRADE_CURRICULAR g 
        ON g.codigo = JSON_VALUE(mtda.REF_CADEIRA, '$.pk')
WHERE JSON_VALUE(mtda.REF_DOCENTE, '$.pk') = :docenteId
  AND g.CODIGO_CURSO = :cursoId
  AND g.CODIGO_CLASSE = :classeId
  `;

    const result = await this.dataSource.query(sql, [docenteId, cursoId, classeId]);

    return {
      data: toLowerCaseKeys(result),
    };
  }

  private gernerateRefAnoLectivo(data:any) {
    return JSON.stringify({
      pk: data.codigo,
      desc: data.designacao,
    });
}

private  generateRefDocente(data:any) {
const docenteParsed =   JSON.parse(data.codigo_utilizador);
    return JSON.stringify({
      pk: data.codigo,
      desc: docenteParsed.desc,
    });
}

private generateRefGradeCurricular(data:any) {
  return JSON.stringify({
    pk: data.codigo,
    desc: data.designacao,
  });
}
}