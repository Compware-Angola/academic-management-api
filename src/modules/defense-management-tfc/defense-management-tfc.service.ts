import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { AtribuirOrientadorTemaDto, CreateOrientadorDto, FiltroListagemGeralDto, FiltroOrientadorDto, ListarAlunosPorOrientadorDto, ListFinalistStudentsQueryDto } from './dto';

@Injectable()
export class DefenseManagementTfcService {
  constructor(private readonly dataSource: DataSource) {}

async listFinalistStudents(query: ListFinalistStudentsQueryDto) {
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
      LEFT JOIN FK2_MCA_TB_UTILIZADOR u ON u.PK_UTILIZADOR = TO_NUMBER(JSON_VALUE(o.REF_UTILIZADOR, '$.pk'))
      LEFT JOIN FK2_MGD_TB_DOCENTE d ON d.CODIGO = TO_NUMBER(JSON_VALUE(o.REF_DOCENTE, '$.pk'))
      LEFT JOIN FK2_MCA_TB_UTILIZADOR doc_utili ON doc_utili.PK_UTILIZADOR = TO_NUMBER(JSON_VALUE(d.CODIGO_UTILIZADOR, '$.pk'))
      WHERE (TO_NUMBER(JSON_VALUE(o.REF_ANO_LECTIVO, '$.pk')) = :anoId OR :anoId IS NULL)
        AND (TO_NUMBER(JSON_VALUE(o.REF_CURSO, '$.pk')) = :cursoId OR :cursoId IS NULL)
        AND (o.ESTADO_ORIENTADOR = :estado OR :estado IS NULL)
        AND (O.DELETED_AT IS NULL)
    `;

    const sql = `
      SELECT 
        o.PK_ORIENTADOR AS "codigo",
        c.DESIGNACAO AS "curso",
        doc_utili.NOME AS "nome_orientador",
        o.NUMERO_ORIENTADOS AS "numero_orientados",
        al.DESIGNACAO AS "ano_lectivo",
        o.ESTADO_ORIENTADOR AS "estado",
        u.NOME AS "criado_por",
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
 async createOrientador(data: CreateOrientadorDto, user: string) {
  const { docenteId, cursoId, anoLectivoId, estado } = data;

const docenteQuery = this.dataSource
  .createQueryBuilder()
  .select('D.CODIGO', 'codigo')
  .addSelect('U.NOME', 'nome') 
  .from('FK2_MGD_TB_DOCENTE', 'D')
  .leftJoin('FK2_MCA_TB_UTILIZADOR', 'U', 'U.PK_UTILIZADOR = TO_NUMBER(JSON_VALUE(D.CODIGO_UTILIZADOR, \'$.pk\'))')
  .where('D.CODIGO = :docenteId', { docenteId })
  .getRawOne();

  const utilizadorQuery = this.dataSource
    .createQueryBuilder()
    .select('U.PK_UTILIZADOR', 'codigo')
    .addSelect('U.NOME', 'nome')
    .from('FK2_MCA_TB_UTILIZADOR', 'U')
    .where('U.PK_UTILIZADOR = :user', { user })
    .getRawOne();

  const cursoQuery = this.dataSource
    .createQueryBuilder()
    .select('C.CODIGO', 'codigo')
    .addSelect('C.DESIGNACAO', 'designacao')
    .from('FK2_TB_CURSOS', 'C')
    .where('C.CODIGO = :cursoId', { cursoId })
    .getRawOne();

  const anoLectivoQuery = this.dataSource
    .createQueryBuilder()
    .select('AL.CODIGO', 'codigo')
    .addSelect('AL.DESIGNACAO', 'designacao')
    .from('FK2_TB_ANO_LECTIVO', 'AL')
    .where('AL.CODIGO = :anoLectivoId', { anoLectivoId })
    .getRawOne();

  const [docente, utilizador, curso, anoLectivo] = await Promise.all([
    docenteQuery,
    utilizadorQuery,
    cursoQuery,
    anoLectivoQuery,
  ]);

  if (!docente) throw new NotFoundException('Docente não encontrado.');
  if (!utilizador) throw new NotFoundException('Utilizador não encontrado.');
  if (!curso) throw new NotFoundException('Curso não encontrado.');
  if (!anoLectivo) throw new NotFoundException('Ano Lectivo não encontrado.');


  const jaExiste = await this.dataSource.query(
    `
    SELECT 1 
    FROM FK2_MGTFC_TB_ORIENTADOR 
    WHERE TO_NUMBER(JSON_VALUE(REF_DOCENTE, '$.pk')) = :1
      AND TO_NUMBER(JSON_VALUE(REF_ANO_LECTIVO, '$.pk')) = :2
      AND DELETED_AT IS NULL
    `,
    [docenteId, anoLectivoId]
  );

  if (jaExiste.length > 0) {
    throw new BadRequestException(
      'Este docente já está cadastrado como orientador neste ano lectivo.',
    );
  }

  const refDocente = JSON.stringify({ pk: docente.codigo,
  desc: docente.nome,});
  const refCurso = JSON.stringify({
    pk: curso.codigo,
    desc: curso.designacao,
  });
  const refAnoLectivo = JSON.stringify({
    pk: anoLectivo.codigo,
    desc: anoLectivo.designacao,
  });
  const refUtilizador = JSON.stringify({ pk: utilizador.codigo,
  desc: utilizador.nome, });

  const result = await this.dataSource
    .createQueryBuilder()
    .insert()
    .into('FK2_MGTFC_TB_ORIENTADOR')
    .values({
      REF_DOCENTE: refDocente,
      REF_CURSO: refCurso,
      REF_ANO_LECTIVO: refAnoLectivo,
      REF_UTILIZADOR: refUtilizador,
      ESTADO_ORIENTADOR: estado,
      NUMERO_ORIENTADOS: 0,
      CREATED_AT: new Date(),
      UPDATED_AT: new Date(),
    })
    .execute();

  return result;
}

async atribuirOrientadorETemaAoAluno(data: AtribuirOrientadorTemaDto, userContext: string) {
  const { codigoMatricula, codigoOrientador, tema, anoLectivoId } = data;


  const orientadorQuery = this.dataSource
    .createQueryBuilder()
    .select('O.PK_ORIENTADOR', 'pk')
    .from('FK2_MGTFC_TB_ORIENTADOR', 'O')
    .where('O.PK_ORIENTADOR = :orientador', { orientador: codigoOrientador })
    .andWhere("TO_NUMBER(JSON_VALUE(REF_ANO_LECTIVO, '$.pk')) = :anoId", { anoId: anoLectivoId })
    .andWhere("O.DELETED_AT IS NULL")
    .getRawOne();

 
  const anoLectivoQuery = this.dataSource
    .createQueryBuilder()
    .select('AL.CODIGO', 'codigo')
    .addSelect('AL.DESIGNACAO', 'designacao')
    .from('FK2_TB_ANO_LECTIVO', 'AL')
    .where('AL.CODIGO = :anoLectivoId', { anoLectivoId })
    .getRawOne();

  
  const utilizadorQuery = this.dataSource
    .createQueryBuilder()
    .select('U.PK_UTILIZADOR', 'codigo')
    .addSelect('U.NOME', 'nome')
    .from('FK2_MCA_TB_UTILIZADOR', 'U')
    .where('U.PK_UTILIZADOR = :user', { user: userContext })
    .getRawOne();

  const [orientador, anoLectivo, utilizador] = await Promise.all([
    orientadorQuery,
    anoLectivoQuery,
    utilizadorQuery
  ]);


  if (!orientador) throw new NotFoundException('Orientador não encontrado ou não pertence a este ano lectivo.');
  if (!anoLectivo) throw new NotFoundException('Ano Lectivo não encontrado.');
  if (!utilizador) throw new NotFoundException('Utilizador não encontrado.');
  const eFinalista = await this.verificarSeAlunoEFinalista(codigoMatricula, anoLectivoId);
  if (!eFinalista) {
    throw new BadRequestException(`O aluno ${codigoMatricula} não cumpre os requisitos de finalista.`);
  }

  const jaTemOrientador = await this.verificarSeAlunoJaTemOrientador(codigoMatricula, anoLectivoId);
  if (jaTemOrientador) {
    throw new BadRequestException(`O aluno ${codigoMatricula} já possui orientador neste ano lectivo.`);
  }

 
  const refAnoLectivo = JSON.stringify({
    pk: anoLectivo.codigo,
    desc: anoLectivo.designacao,
  });

  const refUtilizador = JSON.stringify({
    pk: utilizador.codigo,
    desc: utilizador.nome,
  });

 
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into('FK2_MGTFC_TB_ORIENTADOR_ALUNO')
      .values({
        FK_ORIENTADOR: codigoOrientador,
        FK_MATRICULA: codigoMatricula,
        TEMA: tema.toUpperCase(),
        REF_UTILIZADOR: refUtilizador,
        REF_ANO_LECTIVO: refAnoLectivo,
        CREATED_AT: new Date(),
        UPDATED_AT: new Date(),
      })
      .execute();

    await this.dataSource.query(
      `UPDATE FK2_MGTFC_TB_ORIENTADOR 
       SET NUMERO_ORIENTADOS = NVL(NUMERO_ORIENTADOS, 0) + 1 
       WHERE PK_ORIENTADOR = :1`,
      [codigoOrientador]
    );

    return {
      message: 'Orientador e tema atribuídos com sucesso.',
    };
}

async listarAlunosPorOrientador(data:ListarAlunosPorOrientadorDto) {
  const {orientadorId,anoLectivoId} = data;
  const sql = `
    SELECT 
        tp.Nome_Completo AS "nome_aluno",
        tc.Designacao AS "curso",
        oa.TEMA AS "tema",
        oa.FK_MATRICULA AS "matricula",
        TO_CHAR(oa.CREATED_AT, 'DD/MM/YYYY') AS "data_atribuicao"
    FROM FK2_MGTFC_TB_ORIENTADOR_ALUNO oa
    INNER JOIN FK2_TB_MATRICULAS tm ON tm.Codigo = oa.FK_MATRICULA
    INNER JOIN FK2_TB_ADMISSAO ta ON ta.codigo = tm.Codigo_Aluno
    INNER JOIN FK2_TB_PREINSCRICAO tp ON tp.Codigo = ta.pre_incricao
    INNER JOIN FK2_TB_CURSOS tc ON tc.Codigo = tm.Codigo_Curso
    WHERE oa.FK_ORIENTADOR = :orientadorId
      AND TO_NUMBER(JSON_VALUE(oa.REF_ANO_LECTIVO, '$.pk')) = :anoId
      AND oa.DELETED_AT IS NULL
    ORDER BY tp.Nome_Completo ASC
  `;

  try {
    const data = await this.dataSource.query(sql, [orientadorId, anoLectivoId]);

    return {
      alunos: toLowerCaseKeys(data)
    };
  } catch (error) {
    throw new InternalServerErrorException('Erro ao listar alunos orientados.');
  }
}
async listarOrientacoesGeral(filtros: FiltroListagemGeralDto) {
  const { anoLectivoId, orientadorId, cursoId, search, page = 1, limit = 10 } = filtros;
  const offset = (page - 1) * limit;

  
  const baseQuery = `
    FROM FK2_MGTFC_TB_ORIENTADOR_ALUNO oa
    INNER JOIN FK2_TB_MATRICULAS tm ON tm.Codigo = oa.FK_MATRICULA
    INNER JOIN FK2_TB_ADMISSAO ta ON ta.codigo = tm.Codigo_Aluno
    INNER JOIN FK2_TB_PREINSCRICAO tp ON tp.Codigo = ta.pre_incricao
    INNER JOIN FK2_TB_CURSOS tc ON tc.Codigo = tm.Codigo_Curso
    INNER JOIN FK2_MGTFC_TB_ORIENTADOR o ON o.PK_ORIENTADOR = oa.FK_ORIENTADOR
    -- Join para pegar o nome do docente que é orientador
    LEFT JOIN FK2_MGD_TB_DOCENTE d ON d.CODIGO = TO_NUMBER(JSON_VALUE(o.REF_DOCENTE, '$.pk'))
    LEFT JOIN FK2_MCA_TB_UTILIZADOR u_doc ON u_doc.PK_UTILIZADOR = TO_NUMBER(JSON_VALUE(d.CODIGO_UTILIZADOR, '$.pk'))
    WHERE TO_NUMBER(JSON_VALUE(oa.REF_ANO_LECTIVO, '$.pk')) = :anoId
      AND (:orientadorId IS NULL OR oa.FK_ORIENTADOR = :orientadorId)
      AND (:cursoId IS NULL OR tm.Codigo_Curso = :cursoId)
      AND (:search IS NULL OR UPPER(tp.Nome_Completo) LIKE UPPER(:search))
      AND oa.DELETED_AT IS NULL
  `;

  const sqlData = `
    SELECT 
        tp.Nome_Completo AS "nome_aluno",
        tm.Codigo AS "matricula",
        tc.Designacao AS "curso",
        oa.TEMA AS "tema",
        u_doc.NOME AS "nome_orientador",
        TO_CHAR(oa.CREATED_AT, 'DD/MM/YYYY') AS "data_vínculo"
    ${baseQuery}
    ORDER BY tp.Nome_Completo ASC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;

  const sqlCount = `SELECT COUNT(*) AS total ${baseQuery}`;

  const params = {
    anoId: anoLectivoId,
    orientadorId: orientadorId || null,
    cursoId: cursoId || null,
    search: search ? `%${search}%` : null,
    offset,
    limit
  };

 
    const [data, countRes] = await Promise.all([
      this.dataSource.query(sqlData, [params.anoId, params.orientadorId, params.orientadorId, params.cursoId, params.cursoId, params.search, params.search, params.offset, params.limit]),
      this.dataSource.query(sqlCount, [params.anoId, params.orientadorId, params.orientadorId, params.cursoId, params.cursoId, params.search, params.search])
    ]);

    const total = Number(countRes[0]?.TOTAL || 0);

    return {
      data: toLowerCaseKeys(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
 
}

private async verificarSeAlunoEFinalista(matricula: number, anoLectivo: number): Promise<boolean> {
  const limiteCadeirasEmFalta = 5;
  const sql = `
    WITH total_cadeiras AS (
        SELECT tpcc.codigo_curso, COUNT(tpcg.codigo_grade_curricular) AS total
        FROM FK2_TB_PLANO_CURRICULAR_GRADE tpcg
        INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc ON tpcg.codigo_plano_curricular_curso = tpcc.codigo
        WHERE tpcc.codigo_ano_lectivo = :1
        GROUP BY tpcc.codigo_curso
    ),
    cadeiras_concluidas AS (
        SELECT tgca.codigo_matricula, COUNT(tgca.codigo_grade_curricular) AS concluidas
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        INNER JOIN FK2_TB_GRADE_CURRICULAR tgc ON tgc.Codigo = tgca.codigo_grade_curricular
        WHERE tgca.Codigo_Status_Grade_Curricular = 3
          AND tgc.status_ NOT IN (0,3)
          AND tgca.codigo_matricula = :2
        GROUP BY tgca.codigo_matricula
    )
    SELECT 1
    FROM FK2_TB_MATRICULAS tm
    LEFT JOIN total_cadeiras tc1 ON tc1.codigo_curso = tm.Codigo_Curso
    LEFT JOIN cadeiras_concluidas cc ON cc.codigo_matricula = tm.Codigo
    WHERE tm.Codigo = :3
      AND (NVL(tc1.total, 0) - NVL(cc.concluidas, 0)) <= :4
      AND EXISTS (
          SELECT 1 FROM FK2_TB_GRADE_CURRICULAR_ALUNO gca
          INNER JOIN FK2_TB_GRADE_CURRICULAR gc ON gc.CODIGO = gca.CODIGO_GRADE_CURRICULAR
          INNER JOIN FK2_TB_DISCIPLINAS d ON d.CODIGO = gc.CODIGO_DISCIPLINA
          WHERE gca.CODIGO_MATRICULA = tm.Codigo
            AND (UPPER(d.NOME_ABREVIATURA) LIKE '%TFC%' OR UPPER(d.DESIGNACAO) LIKE '%TFC%')
      )
  `;

  try {
    const result = await this.dataSource.query(sql, [
      anoLectivo, 
      matricula, 
      matricula, 
      limiteCadeirasEmFalta
    ]);

    return result.length > 0;
  } catch (error) {
   
    throw new InternalServerErrorException('Erro interno ao validar dados do aluno.');
  }
}
private async verificarSeAlunoJaTemOrientador(matricula: number, anoLectivoId: number): Promise<boolean> {
 
  try {
    const result = await this.dataSource
      .createQueryBuilder()
      .select('*')
      .from('FK2_MGTFC_TB_ORIENTADOR_ALUNO', 'OA') 
      .where('OA.FK_MATRICULA = :matricula', { matricula })
      .andWhere("TO_NUMBER(JSON_VALUE(REF_ANO_LECTIVO, '$.pk')) = :anoId", { anoId: anoLectivoId })
      .getRawOne();

    return !!result;
  } catch (error) {
    console.error('Erro ao verificar se aluno já tem orientador:', error);
    throw new InternalServerErrorException(
      'Erro ao validar vínculo de orientação do aluno.',
    );
  }
}
} 