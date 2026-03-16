import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { FiltroOrientadorDto } from './dto';

@Injectable()
export class DefenseManagementTfcService {
  constructor(private readonly dataSource: DataSource) {}

  async listFinalistStudents(query: any) {
    const { 
      anoLectivo, 
      tipoCandidatura = 0, 
      curso = 0,           
      page = 1, 
      limit = 10 
    } = query;
    
    const qtdCadeiras = 5; 
    const offset = (page - 1) * limit;
   
    const commonCTEs = `
      WITH total_cadeiras AS (
          SELECT tpcc.codigo_curso, COUNT(tpcg.codigo_grade_curricular) AS total
          FROM FK2_TB_PLANO_CURRICULAR_GRADE tpcg
          INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc ON tpcg.codigo_plano_curricular_curso = tpcc.codigo
          WHERE tpcc.codigo_ano_lectivo = :1
          GROUP BY tpcc.codigo_curso
      ),
      total_cadeiras_candidatura AS (
          SELECT tp2.Curso_Candidatura AS codigo_curso, COUNT(tpcg.codigo_grade_curricular) AS total
          FROM FK2_TB_PREINSCRICAO tp2
          INNER JOIN FK2_TB_ADMISSAO ta ON ta.pre_incricao = tp2.Codigo
          INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc ON tpcc.codigo_curso = tp2.Curso_Candidatura
          INNER JOIN FK2_TB_PLANO_CURRICULAR_GRADE tpcg ON tpcg.codigo_plano_curricular_curso = tpcc.codigo
          WHERE tpcc.codigo_ano_lectivo = :2
          GROUP BY tp2.Curso_Candidatura
      ),
      cadeiras_concluidas AS (
          SELECT 
              tgca.codigo_matricula, 
              tgc.Codigo_Curso,
              COUNT(tgca.codigo_grade_curricular) AS concluidas
          FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
          INNER JOIN FK2_TB_GRADE_CURRICULAR tgc ON tgc.Codigo = tgca.codigo_grade_curricular
          WHERE tgca.Codigo_Status_Grade_Curricular = 3
            AND tgc.status_ NOT IN (0,3)
          GROUP BY tgca.codigo_matricula, tgc.Codigo_Curso
      )
    `;

    const whereClause = `
      WHERE (:3 = 0 OR tc.tipo_candidatura = :4)
        AND (:5 = 0 OR tc.Codigo = :6)
        AND (NVL(tc1.total, 0) + NVL(tc2.total, 0) - NVL(cc.concluidas, 0)) = :7
        AND EXISTS (
            SELECT 1
            FROM FK2_TB_GRADE_CURRICULAR_ALUNO gca
            INNER JOIN FK2_TB_GRADE_CURRICULAR gc ON gc.CODIGO = gca.CODIGO_GRADE_CURRICULAR
            INNER JOIN FK2_TB_DISCIPLINAS d ON d.CODIGO = gc.CODIGO_DISCIPLINA
            INNER JOIN FK2_TB_PLANO_CURRICULAR_GRADE pcg ON pcg.CODIGO_GRADE_CURRICULAR = gc.CODIGO
            INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO pcc ON pcc.CODIGO = pcg.CODIGO_PLANO_CURRICULAR_CURSO
            WHERE gca.CODIGO_MATRICULA = tm.Codigo
              AND pcc.CODIGO_ANO_LECTIVO = :8
              AND (UPPER(d.NOME_ABREVIATURA) LIKE '%TFC%' OR UPPER(d.DESIGNACAO) LIKE '%TFC%')
        )
    `;

    const sqlData = `
      ${commonCTEs}
      SELECT
          tp.Nome_Completo AS nome,
          tp.Bilhete_Identidade AS bilhete,
          tp.Sexo AS genero,
          tm.Codigo AS matricula,
          tc.Designacao AS curso
      FROM FK2_TB_MATRICULAS tm
      INNER JOIN FK2_TB_ADMISSAO ta ON ta.codigo = tm.Codigo_Aluno
      INNER JOIN FK2_TB_PREINSCRICAO tp ON tp.Codigo = ta.pre_incricao
      INNER JOIN FK2_TB_CURSOS tc ON tc.Codigo = tm.Codigo_Curso
      LEFT JOIN total_cadeiras tc1 ON tc1.codigo_curso = tm.Codigo_Curso
      LEFT JOIN total_cadeiras_candidatura tc2 ON tc2.codigo_curso = tp.Curso_Candidatura AND tp.Curso_Candidatura != tm.Codigo_Curso
      LEFT JOIN cadeiras_concluidas cc ON (cc.codigo_matricula = tm.Codigo AND cc.Codigo_Curso = tm.Codigo_Curso)
      ${whereClause}
      ORDER BY tp.Nome_Completo
      OFFSET :9 ROWS FETCH NEXT :10 ROWS ONLY
    `;

    const sqlCount = `
      ${commonCTEs}
      SELECT COUNT(*) AS total
      FROM FK2_TB_MATRICULAS tm
      INNER JOIN FK2_TB_ADMISSAO ta ON ta.codigo = tm.Codigo_Aluno
      INNER JOIN FK2_TB_PREINSCRICAO tp ON tp.Codigo = ta.pre_incricao
      INNER JOIN FK2_TB_CURSOS tc ON tc.Codigo = tm.Codigo_Curso
      LEFT JOIN total_cadeiras tc1 ON tc1.codigo_curso = tm.Codigo_Curso
      LEFT JOIN total_cadeiras_candidatura tc2 ON tc2.codigo_curso = tp.Curso_Candidatura AND tp.Curso_Candidatura != tm.Codigo_Curso
      LEFT JOIN cadeiras_concluidas cc ON (cc.codigo_matricula = tm.Codigo AND cc.Codigo_Curso = tm.Codigo_Curso)
      ${whereClause}
    `;

 
    const params = [
      anoLectivo,        // :1
      anoLectivo,        // :2
      tipoCandidatura,   // :3
      tipoCandidatura,   // :4
      curso,             // :5
      curso,             // :6
      qtdCadeiras,       // :7
      anoLectivo         // :8 (Filtro TFC)
    ];

    try {
      const [data, countResult] = await Promise.all([
        this.dataSource.query(sqlData, [...params, offset, limit]),
        this.dataSource.query(sqlCount, params)
      ]);

      const total = Number(countResult[0]?.TOTAL || 0);

      return {
        data: toLowerCaseKeys(data),
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Erro na query de alunos TFC:', error);
      throw new InternalServerErrorException('Erro ao buscar lista de finalistas.');
    }
  }

  async orientadoresTFC(filtros: FiltroOrientadorDto) {
    const { anoLectivoId, cursoId, estado, page=1, limit=20 } = filtros;
    const offset = (page - 1) * limit;

    const baseQuery = `
      FROM FK2_MGTFC_TB_ORIENTADOR o
      LEFT JOIN FK2_TB_CURSOS c ON c.CODIGO = TO_NUMBER(JSON_VALUE(o.REF_CURSO, '$.pk'))
      LEFT JOIN FK2_TB_ANO_LECTIVO al ON al.CODIGO = TO_NUMBER(JSON_VALUE(o.REF_ANO_LECTIVO, '$.pk'))
      LEFT JOIN FK2_TB_UTILIZADORES u ON u.CODIGO = TO_NUMBER(JSON_VALUE(o.REF_UTILIZADOR, '$.pk'))
      WHERE 1=1
        AND (TO_NUMBER(JSON_VALUE(o.REF_ANO_LECTIVO, '$.pk')) = :anoId OR :anoId IS NULL)
        AND (TO_NUMBER(JSON_VALUE(o.REF_CURSO, '$.pk')) = :cursoId OR :cursoId IS NULL)
        AND (o.ESTADO_ORIENTADOR = :estado OR :estado IS NULL)
        AND (o.DELETED_AT IS NULL)
    `;

    const sql = `
      SELECT 
        o.PK_ORIENTADOR AS "codigo",
        c.DESIGNACAO AS "curso",
        o.NUMERO_ORIENTADOS AS "numero_orientados",
        al.DESIGNACAO AS "ano_lectivo",
        o.ESTADO_ORIENTADOR AS "estado",
        u.NOME AS "utilizador",
        TO_CHAR(o.CREATED_AT, 'DD/MM/YYYY') AS "data_cadastro"
      ${baseQuery}
      ORDER BY o.CREATED_AT DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;

    const params = {
      anoId: anoLectivoId || null,
      cursoId: cursoId || null,
      estado: estado || null,
      offset,
      limit
    };

    const data = await this.dataSource.query(sql, [
      params.anoId, params.anoId,
      params.cursoId, params.cursoId,
      params.estado, params.estado,
      params.offset,
      params.limit
    ]);

    // Busca o total para a paginação
    const totalResult = await this.dataSource.query(`SELECT COUNT(*) as TOTAL ${baseQuery}`, [
      params.anoId, params.anoId,
      params.cursoId, params.cursoId,
      params.estado, params.estado
    ]);

    return {
      data,
      total: totalResult[0].TOTAL,
      page,
      limit
    };
  }
  
}