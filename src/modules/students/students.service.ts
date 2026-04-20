import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import {
  FindStudentsDTO,
  ResetStudentPasswordDTO,
  UpdateStudentContactDTO,
  UpdateStudentPersonalDataDTO,
} from './dto/find-students.dto';
import { gerarHashExterno } from '../util/hash.util';
import { ActivateRegistrationDTO } from './dto/activate-registration.dto';
import { AcademicHistoryDTO } from './dto/academic-history';
import { ChangeCourseDTO } from './dto/change-course.dto';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { FilterMapaAnualFinalistasDto } from './dto/filter-mapa-anual-finalista.dto';
import { FilterRegistoPrimarioExamesAcessoDto } from './dto/filter-registo-primario-exames-acesso.dto';
import { AcademicHistoryEquivalenciaDTO } from './dto/academic-history-equivalencia.dto';
import { AcademicHistoryMigracaoDadosDTO } from './dto/academic-history-migracao.dto';
import { DefinirEspecialidadeDTO } from './dto/definir-especialidade.dto';

@Injectable()
export class StudentsService {
  
  constructor(private readonly dataSource: DataSource, private readonly anoLectivoUtil: AnoLectivoUtil) {

  }


  async getProfileEstatistic(codigoMatricula: number): Promise<any> {
    const sql = `
    SELECT
    m.codigo               AS codigo_matricula,
    p.BILHETE_IDENTIDADE   AS bi,
    c.designacao           AS curso,
    c.codigo               AS curso_codigo,
    pe.DESIGNACAO          AS periodo,
    pe.codigo              AS periodo_codigo,
    m.ESTADO_MATRICULA     AS estado,
    p.Nome_Completo        AS nome_completo,
    p.Bilhete_Identidade   AS bi_aluno,
    p.Email                AS email,
    p.Contactos_Telefonicos AS contacto,
    p.CONTACTO_DE_EMERGENCIA AS contacto_alternativo,
    p.Data_Nascimento      AS data_nascimento,
    p.DATA_EMISSAO_BI      AS data_emissao_bi,
    p.DATA_VALIDADE_BI     AS data_validade_bi,
    p.PAI                  AS pai,
    p.MAE                  AS mae,
    p.CODIGO_OCUPACAO      AS ocupacao_codigo,
    p.CODIGO_PROFISSAO     AS profissao_codigo,
    p.NATURALIDADE         AS naturalidade,
    nac.DESIGNACAO         AS nacionalidade,
    p.ESTADO_CIVIL         AS estado_civil,
    p.SEXO                 AS sexo,
    fac.DESIGNACAO         AS faculdade,
    tpc.DESIGNACAO         AS grau,
    pr.DESIGNACAO          AS regime,
    p.MORADA_COMPLETA      AS morada,
    p.SALDO_RESET       AS saldo_atual,
    p.SALDO_RESET_ANTER AS saldo_anterior,
    u.FOTO                 AS foto
FROM FK2_TB_MATRICULAS m
INNER JOIN FK2_TB_ADMISSAO a
    ON a.codigo = m.CODIGO_ALUNO
INNER JOIN FK2_TB_PREINSCRICAO p
    ON p.codigo = a.PRE_INCRICAO
INNER JOIN FK2_USERS u
    ON u.ID = p.USER_ID
INNER JOIN FK2_TB_CURSOS c
    ON c.codigo = m.CODIGO_CURSO
INNER JOIN FK2_TB_FACULDADE fac
    ON fac.codigo = c.FACULDADE_ID
INNER JOIN FK2_TB_PERIODOS pe
    ON pe.codigo = p.CODIGO_TURNO
INNER JOIN FK2_TB_NACIONALIDADES nac
    ON nac.CODIGO = p.CODIGO_NACIONALIDADE
INNER JOIN FK2_TB_TIPO_CANDIDATURA tpc
    ON tpc.ID = p.CODIGO_TIPO_CANDIDATURA
INNER JOIN FK2_TB_PERIODOS pr
    ON pr.CODIGO = p.CODIGO_TURNO
WHERE m.codigo = :codigoMatricula

    `;

    const result = await this.dataSource.query(sql, {
      codigoMatricula,
    } as any);

    return toLowerCaseKeys(result[0]) || null;
  }

  async getSugestoes(search: string): Promise<any[]> {
    if (!search || search.trim().length < 2) {
      return [];
    }

    const sql = `
    SELECT
        m.codigo               AS codigo_matricula,
        p.BILHETE_IDENTIDADE   AS bi,
        c.designacao           AS curso,
        pe.DESIGNACAO          AS periodo,
         p.Nome_Completo              AS nome_completo,
        m.ESTADO_MATRICULA     AS estado
    FROM FK2_TB_MATRICULAS m
    INNER JOIN FK2_TB_ADMISSAO      a  ON a.codigo  = m.CODIGO_ALUNO
     INNER JOIN FK2_TB_PREINSCRICAO p
             ON p.Codigo = a.pre_incricao
    INNER JOIN FK2_TB_PREINSCRICAO  p  ON p.codigo  = a.PRE_INCRICAO
    INNER JOIN FK2_TB_CURSOS        c  ON c.codigo  = m.CODIGO_CURSO
    INNER JOIN FK2_TB_PERIODOS      pe ON pe.codigo = p.CODIGO_TURNO
    WHERE
        TO_CHAR(m.codigo)         LIKE :search
       OR p.BILHETE_IDENTIDADE      LIKE :search
       OR LOWER(c.designacao)       LIKE LOWER(:search)
       OR  LOWER(p.Nome_Completo)          LIKE LOWER(:search)


    FETCH FIRST 10 ROWS ONLY
  `;
    const result = await this.dataSource.query(sql, {
      search: `%${search}%`,
    } as any);
    return toLowerCaseKeys(result);
  }

  async findStudents(filters: FindStudentsDTO) {
    const {
      anoLectivo,
      codigoCurso,
      faculdadeId,
      codigoMatricula,
      limit = 25,
      page = 1,
    } = filters;

    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any = {};

    conditions.push(`
    EXISTS (
      SELECT 1
      FROM FK2_TB_CONFIRMACOES con
      WHERE con.CODIGO_MATRICULA = m.codigo
    )
  `);

    if (anoLectivo) {
      conditions.push(`con.CODIGO_ANO_LECTIVO = :anoLectivo`);
      params.anoLectivo = anoLectivo;
    }

    if (codigoCurso) {
      conditions.push(`c.codigo = :codigoCurso`);
      params.codigoCurso = codigoCurso;
    }

    if (faculdadeId) {
      conditions.push(`c.FACULDADE_ID = :faculdadeId`);
      params.faculdadeId = faculdadeId;
    }

    if (codigoMatricula) {
      conditions.push(`m.codigo = :codigoMatricula`);
      params.codigoMatricula = codigoMatricula;
    }

    const whereClause = conditions.length ? conditions.join(' AND ') : '1=1';

    const sql = `
    SELECT
      m.codigo               AS codigo_matricula,
      p.NOME_COMPLETO        AS nome_completo,
      p.BILHETE_IDENTIDADE   AS bi,
      c.designacao           AS curso,
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
    WHERE ${whereClause}
    ORDER BY m.codigo DESC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;

    const sqlParams = {
      ...params,
      offset,
      limit,
    };

    const sqlCount = `
    SELECT COUNT(*) AS TOTAL
    FROM FK2_TB_MATRICULAS m
    INNER JOIN FK2_TB_CURSOS c
      ON c.codigo = m.CODIGO_CURSO
    INNER JOIN FK2_TB_ADMISSAO a
      ON a.codigo = m.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO p
      ON p.codigo = a.PRE_INCRICAO
    INNER JOIN FK2_TB_TIPO_CANDIDATURA ca
      ON ca.ID = c.TIPO_CANDIDATURA
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


 async listarMapaAnualFinalistas(filter: FilterMapaAnualFinalistasDto) {
  const {
    page = 1,
    limit = 10,
    anoLectivo = 0,
    grau = 0,
    search,
  } = filter;

  if (!anoLectivo || anoLectivo === 0) {
    throw new BadRequestException("O ano lectivo é obrigatório");
  }

  const offset = (page - 1) * limit;

  const baseParams: Record<string, any> = {
    anoLectivo,
    grau,
    grau_zero: grau,
  };

  let searchClause = "";
  if (search && search.trim()) {
    searchClause = `
      AND (
        UPPER(b.NOME) LIKE :search
        OR UPPER(NVL(b.NUM_BILHETE, '-')) LIKE :search
      )
    `;
    baseParams.search = `%${search.trim().toUpperCase()}%`;
  }

  const cte = `
    WITH base_estudantes AS (
      SELECT DISTINCT
        tm.CODIGO AS CODIGO_MATRICULA,
        tm.CODIGO_CURSO,
        ta.PRE_INCRICAO,
        tp.NOME_COMPLETO AS NOME,
        tp.BILHETE_IDENTIDADE AS NUM_BILHETE,
        tp.SEXO AS GENERO,
        EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM tp.DATA_NASCIMENTO) AS IDADE,
        tp.DATA_NASCIMENTO,
        tpr.DESIGNACAO AS PROVINCIA,
        tm2.DESIGNACAO AS MUNICIPIO,
        tn.DESIGNACAO AS PAIS_ORIGEM,
        CASE
          WHEN tp.CODIGO_TURNO = 5 THEN 'Regular'
          ELSE 'Pós-Laboral'
        END AS PERIODO_ESTUDO,
        tf.DESIGNACAO AS UNIDADE_ORGANICA,
        tc.DESIGNACAO AS CURSO,
        EXTRACT(YEAR FROM tm.DATA_MATRICULA) AS ANO_PRIMEIRA_MATRICULA,
        'N/A' AS TRABALHADOR,
        tc.DURACAO AS DURACAO_CURSO
      FROM FK2_TB_MATRICULAS tm
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
      INNER JOIN FK2_TB_TIPO_CANDIDATURA ttc
        ON ttc.ID = tp.CODIGO_TIPO_CANDIDATURA
      INNER JOIN FK2_TB_CONFIRMACOES tcf
        ON tcf.CODIGO_MATRICULA = tm.CODIGO
      INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
      INNER JOIN FK2_TB_FACULDADE tf
        ON tf.CODIGO = tc.FACULDADE_ID
      LEFT JOIN FK2_TB_PROVINCIAS tpr
        ON tpr.CODIGO = tp.CODIGO_PROVINCIA_RESIDENCIA_PERMANENTE
      LEFT JOIN FK2_TB_MUNICIPIOS tm2
        ON tm2.CODIGO = tp.CODIGO_MUNICIPIO
      LEFT JOIN FK2_TB_NACIONALIDADES tn
        ON tn.CODIGO = tp.CODIGO_NACIONALIDADE
      WHERE tcf.CODIGO_ANO_LECTIVO = :anoLectivo
        AND (ttc.ID = :grau OR :grau_zero = 0)
    ),

    cadeiras_concluidas AS (
      SELECT
        tgca.CODIGO_MATRICULA,
        tgc.CODIGO_CURSO,
        COUNT(tgca.CODIGO_GRADE_CURRICULAR) AS QTD_CADEIRAS_CONCLUIDAS,
        SUM(tgca.NOTA) AS SOMA_NOTAS
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
      WHERE tgca.CODIGO_STATUS_GRADE_CURRICULAR = 3
        AND tgc.STATUS_ NOT IN (0, 3)
      GROUP BY
        tgca.CODIGO_MATRICULA,
        tgc.CODIGO_CURSO
    ),

    cadeiras_curso_base AS (
      SELECT
        tpcc.CODIGO_CURSO,
        COUNT(tpcg.CODIGO_GRADE_CURRICULAR) AS QTD_BASE
      FROM FK2_TB_PLANO_CURRICULAR_GRADE tpcg
      INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc
        ON tpcg.CODIGO_PLANO_CURRICULAR_CURSO = tpcc.CODIGO
      WHERE tpcc.CODIGO_ANO_LECTIVO = :anoLectivo
      GROUP BY tpcc.CODIGO_CURSO
    ),

    cadeiras_curso_opcao AS (
      SELECT
        b.CODIGO_MATRICULA,
        COUNT(tpcg.CODIGO_GRADE_CURRICULAR) AS QTD_OPCAO
      FROM base_estudantes b
      INNER JOIN FK2_TB_PREINSCRICAO tp2
        ON tp2.CODIGO = b.PRE_INCRICAO
      INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc
        ON tpcc.CODIGO_CURSO = tp2.CURSO_CANDIDATURA
       AND tpcc.CODIGO_ANO_LECTIVO = :anoLectivo
      INNER JOIN FK2_TB_PLANO_CURRICULAR_GRADE tpcg
        ON tpcg.CODIGO_PLANO_CURRICULAR_CURSO = tpcc.CODIGO
      WHERE tp2.CURSO_CANDIDATURA != b.CODIGO_CURSO
      GROUP BY b.CODIGO_MATRICULA
    ),

    finalistas AS (
      SELECT
        b.*,
        NVL(ccb.QTD_BASE, 0) + NVL(cco.QTD_OPCAO, 0) AS QTD_CADEIRAS_CURSO,
        NVL(cc.QTD_CADEIRAS_CONCLUIDAS, 0) AS QTD_CADEIRAS_CONCLUIDAS,
        ROUND(NVL(cc.SOMA_NOTAS, 0) / NULLIF(NVL(cc.QTD_CADEIRAS_CONCLUIDAS, 0), 0), 0) AS MEDIA_FINAL
      FROM base_estudantes b
      LEFT JOIN cadeiras_curso_base ccb
        ON ccb.CODIGO_CURSO = b.CODIGO_CURSO
      LEFT JOIN cadeiras_curso_opcao cco
        ON cco.CODIGO_MATRICULA = b.CODIGO_MATRICULA
      LEFT JOIN cadeiras_concluidas cc
        ON cc.CODIGO_MATRICULA = b.CODIGO_MATRICULA
       AND cc.CODIGO_CURSO = b.CODIGO_CURSO
      WHERE (NVL(ccb.QTD_BASE, 0) + NVL(cco.QTD_OPCAO, 0) - NVL(cc.QTD_CADEIRAS_CONCLUIDAS, 0)) = 1
      ${searchClause}
    )
  `;

  const sql = `
    ${cte}
    SELECT *
    FROM (
      SELECT
        f.*,
        ROW_NUMBER() OVER (ORDER BY f.NOME ASC) AS RN
      FROM finalistas f
    ) t
    WHERE t.RN BETWEEN :offset + 1 AND :offset + :limit
    ORDER BY t.RN
  `;

  const countSql = `
    ${cte}
    SELECT COUNT(*) AS TOTAL
    FROM finalistas
  `;

  const dataParams = {
    ...baseParams,
    offset,
    limit,
  };

  const [result, countResult] = await Promise.all([
    this.dataSource.query(sql, dataParams as any),
    this.dataSource.query(countSql, baseParams as any),
  ]);

  const total = Number(countResult[0]?.TOTAL ?? 0);

  const data = result.map((row: any, index: number) => ({
    numero: offset + index + 1,
    nome: row.NOME,
    numero_bilhete: row.NUM_BILHETE,
    genero: row.GENERO,
    idade: row.IDADE,
    data_nascimento: row.DATA_NASCIMENTO,
    provincia: row.PROVINCIA,
    municipio: row.MUNICIPIO,
    pais_origem: row.PAIS_ORIGEM,
    periodo_estudo: row.PERIODO_ESTUDO,
    unidade_organica: row.UNIDADE_ORGANICA,
    curso: row.CURSO,
    ano_primeira_matricula: row.ANO_PRIMEIRA_MATRICULA,
    trabalhador: row.TRABALHADOR,
    duracao_curso: row.DURACAO_CURSO,
    media_final: row.MEDIA_FINAL,
  }));

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

async listarRegistoPrimarioExamesAcesso(
  filter: FilterRegistoPrimarioExamesAcessoDto,
) {
  const {
    page = 1,
    limit = 10,
    anoLectivo = 0,
    grau = 0,
    search,
  } = filter;

  const offset = (page - 1) * limit;

  const baseParams: Record<string, any> = {
    anoLectivo,
    anoLectivo_zero: anoLectivo,
    grau,
    grau_zero: grau,
  };

  let searchClause = '';
  if (search && search.trim()) {
    searchClause = `
      AND (
        UPPER(b.NOME_COMPLETO) LIKE :search
        OR UPPER(NVL(b.BILHETE_IDENTIDADE, '-')) LIKE :search
      )
    `;
    baseParams.search = `%${search.trim().toUpperCase()}%`;
  }

  const cte = `
    WITH notas_candidatura AS (
      SELECT
        cp.CANDIDATO_ID,
        thp.ANO_LECTIVO_ID,
        MAX(cp.NOTA) AS NOTA
      FROM FK2_CANDIDATO_PROVAS cp
      INNER JOIN FK2_TB_HORARIO_PROVA thp
        ON thp.ID = cp.HORARIO_PROVA_ID
      WHERE cp.TEMPO IS NOT NULL
      GROUP BY cp.CANDIDATO_ID, thp.ANO_LECTIVO_ID
    ),

    base_dados AS (
      SELECT
        tp.CODIGO,
        tp.NOME_COMPLETO,
        tp.BILHETE_IDENTIDADE,
        tp.SEXO,
        tp.DATA_NASCIMENTO,
        tpr.DESIGNACAO AS PROVINCIA_RESIDENCIA,
        tn.DESIGNACAO AS PAIS_ORIGEM,
        tm.DESIGNACAO AS MUNICIPIO,
        tp.CODIGO_TURNO AS PERIODO_CODIGO,
        tc.DESIGNACAO AS CURSO,
        tf.DESIGNACAO AS FACULDADE,
        tp.INSTITUICAO_FORMACAO AS ESCOLA_ENSINO_MEDIO,
        tp.CODIGO_OCUPACAO AS OCUPADO,
        NVL(ne.DESIGNACAO, 'N/A') AS NECESSIDADE_ESPECIAL,
        tha.DESIGNACAO AS PROVENIENCIA,
        tp.CURSO_ENSINO_MEDIO,
        ta.MEDIAFINAL,
        nc.NOTA AS NOTA_CANDIDATURA
      FROM FK2_TB_PREINSCRICAO tp
      INNER JOIN FK2_TB_PROVINCIAS tpr
        ON tpr.CODIGO = tp.CODIGO_PROVINCIA_RESIDENCIA_PERMANENTE
      INNER JOIN FK2_TB_NACIONALIDADES tn
        ON tn.CODIGO = tp.CODIGO_NACIONALIDADE
      LEFT JOIN FK2_TB_MUNICIPIOS tm
        ON tm.CODIGO = tp.CODIGO_MUNICIPIO
      INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tp.CURSO_CANDIDATURA
      INNER JOIN FK2_TB_FACULDADE tf
        ON tf.CODIGO = tc.FACULDADE_ID
      LEFT JOIN FK2_TB_ADMISSAO ta
        ON ta.PRE_INCRICAO = tp.CODIGO
      LEFT JOIN FK2_NECESSIDADE_ESPECIAIS ne
        ON ne.ID = tp.NECESSIDADE_ESPECIAL_ID
      LEFT JOIN FK2_TB_HABILITACAO_ANTERIOR tha
        ON tha.CODIGO = tp.CODIGO_HABILITACAO_ANTERIOR
      LEFT JOIN notas_candidatura nc
        ON nc.CANDIDATO_ID = tp.CODIGO
       AND nc.ANO_LECTIVO_ID = tp.ANOLECTIVO
      WHERE (tp.ANOLECTIVO = :anoLectivo OR :anoLectivo_zero = 0)
        AND (tp.CODIGO_TIPO_CANDIDATURA = :grau OR :grau_zero = 0)
    ),

    final_data AS (
      SELECT
        b.NOME_COMPLETO,
        b.BILHETE_IDENTIDADE,
        b.SEXO,
        FLOOR(MONTHS_BETWEEN(SYSDATE, b.DATA_NASCIMENTO) / 12) AS IDADE,
        b.DATA_NASCIMENTO,
        b.PROVINCIA_RESIDENCIA,
        b.PAIS_ORIGEM,
        b.MUNICIPIO,
        CASE
          WHEN b.PERIODO_CODIGO = 5 THEN 'Regular'
          ELSE 'Pós-Laboral'
        END AS PERIODO_ESTUDO,
        b.CURSO,
        CASE
          WHEN NVL(b.MEDIAFINAL, 0) > 0 THEN b.MEDIAFINAL
          ELSE NVL(b.NOTA_CANDIDATURA, 0)
        END AS NOTA_EXAME_ACESSO,
        b.ESCOLA_ENSINO_MEDIO,
        b.FACULDADE AS UNIDADE_ORGANICA,
        b.NECESSIDADE_ESPECIAL,
        b.PROVENIENCIA,
        b.CURSO_ENSINO_MEDIO,
        CASE
          WHEN b.OCUPADO NOT IN (6, 7, 9) THEN 'Sim'
          ELSE 'Não'
        END AS TRABALHADOR,
        'SIM' AS ESTUDANTE_MATRICULADO_PRIMEIRA_VEZ,
        CASE
          WHEN (
            CASE
              WHEN NVL(b.MEDIAFINAL, 0) > 0 THEN b.MEDIAFINAL
              ELSE NVL(b.NOTA_CANDIDATURA, 0)
            END
          ) > 9.4 THEN 'SIM'
          ELSE 'NÃO'
        END AS ADMISSAO
      FROM base_dados b
      WHERE 1 = 1
      ${searchClause}
    )
  `;

  const sql = `
    ${cte}
    SELECT *
    FROM (
      SELECT
        f.*,
        ROW_NUMBER() OVER (ORDER BY f.NOME_COMPLETO ASC) AS RN
      FROM final_data f
    ) t
    WHERE t.RN BETWEEN :offset + 1 AND :offset + :limit
    ORDER BY t.RN
  `;

  const countSql = `
    ${cte}
    SELECT COUNT(*) AS TOTAL
    FROM final_data
  `;

  const dataParams = {
    ...baseParams,
    offset,
    limit,
  };

  const [result, countResult] = await Promise.all([
    this.dataSource.query(sql, dataParams as any),
    this.dataSource.query(countSql, baseParams as any),
  ]);

  const total = Number(countResult[0]?.TOTAL ?? 0);

  const data = result.map((row: any, index: number) => ({
    numero: offset + index + 1,
    nome: row.NOME_COMPLETO,
    numero_bilhete: row.BILHETE_IDENTIDADE,
    sexo: row.SEXO,
    idade: row.IDADE,
    data_nascimento: row.DATA_NASCIMENTO,
    provincia_residencia: row.PROVINCIA_RESIDENCIA,
    pais_origem: row.PAIS_ORIGEM,
    municipio: row.MUNICIPIO,
    periodo_estudo: row.PERIODO_ESTUDO,
    curso: row.CURSO,
    nota_exame_acesso: row.NOTA_EXAME_ACESSO,
    escola_ensino_medio: row.ESCOLA_ENSINO_MEDIO,
    trabalhador: row.TRABALHADOR,
    unidade_organica: row.UNIDADE_ORGANICA,
    necessidade_especial: row.NECESSIDADE_ESPECIAL,
    proveniencia: row.PROVENIENCIA,
    curso_ensino_medio: row.CURSO_ENSINO_MEDIO,
    estudante_matriculado_primeira_vez:
      row.ESTUDANTE_MATRICULADO_PRIMEIRA_VEZ,
    admissao: row.ADMISSAO,
  }));

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

async listarRegistoPrimarioMatriculados(filter: any) {
  const {
    page = 1,
    limit = 10,
    anoLectivo = 0,
    grau = 0,
    anoCurricular = 0,
    estado = 2,
    search,
  } = filter;

  const safePage = Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Number(limit) > 0 ? Number(limit) : 10;
  const offset = (safePage - 1) * safeLimit;

  const searchValue =
    search && String(search).trim()
      ? `%${String(search).trim().toUpperCase()}%`
      : null;

  const sql = `
    WITH matriculas_filtradas AS (
      SELECT DISTINCT
        tm.CODIGO AS CODIGO_MATRICULA
      FROM FK2_TB_MATRICULAS tm
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
      INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
      INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        ON tgca.CODIGO_MATRICULA = tm.CODIGO
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
      WHERE (tp.ANOLECTIVO = :1 OR :2 = 0)
        AND (tc.TIPO_CANDIDATURA = :3 OR :4 = 0)
        AND (tgc.CODIGO_CLASSE = :5 OR :6 = 0)
    ),

    base_estudantes AS (
      SELECT
        tm.CODIGO AS CODIGO_MATRICULA,
        MAX(tp.NOME_COMPLETO) AS NOME_COMPLETO,
        MAX(tp.BILHETE_IDENTIDADE) AS BILHETE_IDENTIDADE,
        MAX(tp.SEXO) AS SEXO,
        MAX(FLOOR(MONTHS_BETWEEN(SYSDATE, tp.DATA_NASCIMENTO) / 12)) AS IDADE,
        MAX(tp.DATA_NASCIMENTO) AS DATA_NASCIMENTO,
        MAX(tpr.DESIGNACAO) AS PROVINCIA,
        MAX(tm2.DESIGNACAO) AS MUNICIPIO,
        MAX(tn.DESIGNACAO) AS PAIS,
        MAX(tp.CODIGO_TURNO) AS CODIGO_TURNO,
        MAX(tf.DESIGNACAO) AS FACULDADE,
        MAX(tc.DESIGNACAO) AS CURSO,
        MAX(tgc.CODIGO_CLASSE) AS CODIGO_CLASSE,
        MAX(tp.ANOLECTIVO) AS ANO_PREINSCRICAO,
        MAX(tm.ESTADO_MATRICULA) AS ESTADO_MATRICULA
      FROM matriculas_filtradas mf
      INNER JOIN FK2_TB_MATRICULAS tm
        ON tm.CODIGO = mf.CODIGO_MATRICULA
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
      INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
      INNER JOIN FK2_TB_FACULDADE tf
        ON tf.CODIGO = tc.FACULDADE_ID
      INNER JOIN FK2_TB_NACIONALIDADES tn
        ON tn.CODIGO = tp.CODIGO_NACIONALIDADE
      LEFT JOIN FK2_TB_PROVINCIAS tpr
        ON tpr.CODIGO = tp.CODIGO_PROVINCIA_RESIDENCIA_PERMANENTE
      LEFT JOIN FK2_TB_MUNICIPIOS tm2
        ON tm2.CODIGO = tp.CODIGO_MUNICIPIO
      LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        ON tgca.CODIGO_MATRICULA = tm.CODIGO
      LEFT JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
      GROUP BY tm.CODIGO
    ),

    inscricoes AS (
      SELECT
        CODIGO_MATRICULA,
        COUNT(*) AS TOTAL_INSCRICOES
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO
      WHERE CODIGO_ANO_LECTIVO = :7
      GROUP BY CODIGO_MATRICULA
    ),

    aprovadas AS (
      SELECT
        CODIGO_MATRICULA,
        COUNT(*) AS TOTAL_APROVADAS
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO
      WHERE CODIGO_ANO_LECTIVO = :8
        AND CODIGO_STATUS_GRADE_CURRICULAR = 3
      GROUP BY CODIGO_MATRICULA
    ),

    final_data AS (
      SELECT
        b.*,
        NVL(i.TOTAL_INSCRICOES, 0) AS TOTAL_INSCRICOES,
        NVL(a.TOTAL_APROVADAS, 0) AS TOTAL_APROVADAS,
        CASE
          WHEN NVL(i.TOTAL_INSCRICOES, 0) = 0 THEN 0
          ELSE ROUND((NVL(a.TOTAL_APROVADAS, 0) * 100) / i.TOTAL_INSCRICOES, 2)
        END AS TAXA_APROVEITAMENTO,
        CASE
          WHEN b.CODIGO_TURNO = 5 THEN 'Regular'
          ELSE 'Pós-Laboral'
        END AS PERIODO_ESTUDO,
        NVL(TO_CHAR(b.ESTADO_MATRICULA), 'Inactivo') AS SITUACAO_ACADEMICA
      FROM base_estudantes b
      LEFT JOIN inscricoes i
        ON i.CODIGO_MATRICULA = b.CODIGO_MATRICULA
      LEFT JOIN aprovadas a
        ON a.CODIGO_MATRICULA = b.CODIGO_MATRICULA
      WHERE (
        :9 = 2
        OR (:10 = 1 AND b.ANO_PREINSCRICAO = :11)
        OR (:12 = 0 AND b.ANO_PREINSCRICAO <> :13)
      )
        AND (
          :14 IS NULL
          OR UPPER(b.NOME_COMPLETO) LIKE :15
          OR UPPER(NVL(b.BILHETE_IDENTIDADE, '-')) LIKE :16
          OR UPPER(NVL(b.CURSO, '-')) LIKE :17
          OR UPPER(NVL(b.FACULDADE, '-')) LIKE :18
        )
    )

    SELECT *
    FROM (
      SELECT
        f.*,
        ROW_NUMBER() OVER (ORDER BY f.NOME_COMPLETO ASC) AS RN
      FROM final_data f
    ) t
    WHERE t.RN BETWEEN :19 AND :20
    ORDER BY t.RN
  `;

  const sqlParams = [
    anoLectivo,   // :1
    anoLectivo,   // :2
    grau,         // :3
    grau,         // :4
    anoCurricular,// :5
    anoCurricular,// :6
    anoLectivo,   // :7
    anoLectivo,   // :8
    estado,       // :9
    estado,       // :10
    anoLectivo,   // :11
    estado,       // :12
    anoLectivo,   // :13
    searchValue,  // :14
    searchValue,  // :15
    searchValue,  // :16
    searchValue,  // :17
    searchValue,  // :18
    offset + 1,   // :19
    offset + safeLimit, // :20
  ];

  const countSql = `
    WITH matriculas_filtradas AS (
      SELECT DISTINCT
        tm.CODIGO AS CODIGO_MATRICULA
      FROM FK2_TB_MATRICULAS tm
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
      INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
      INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        ON tgca.CODIGO_MATRICULA = tm.CODIGO
      INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
        ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
      WHERE (tp.ANOLECTIVO = :1 OR :2 = 0)
        AND (tc.TIPO_CANDIDATURA = :3 OR :4 = 0)
        AND (tgc.CODIGO_CLASSE = :5 OR :6 = 0)
    ),

    base_estudantes AS (
      SELECT
        tm.CODIGO AS CODIGO_MATRICULA,
        MAX(tp.NOME_COMPLETO) AS NOME_COMPLETO,
        MAX(tp.BILHETE_IDENTIDADE) AS BILHETE_IDENTIDADE,
        MAX(tc.DESIGNACAO) AS CURSO,
        MAX(tf.DESIGNACAO) AS FACULDADE,
        MAX(tp.ANOLECTIVO) AS ANO_PREINSCRICAO
      FROM matriculas_filtradas mf
      INNER JOIN FK2_TB_MATRICULAS tm
        ON tm.CODIGO = mf.CODIGO_MATRICULA
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
      INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
      INNER JOIN FK2_TB_FACULDADE tf
        ON tf.CODIGO = tc.FACULDADE_ID
      GROUP BY tm.CODIGO
    )

    SELECT COUNT(*) AS TOTAL
    FROM base_estudantes b
    WHERE (
      :7 = 2
      OR (:8 = 1 AND b.ANO_PREINSCRICAO = :9)
      OR (:10 = 0 AND b.ANO_PREINSCRICAO <> :11)
    )
      AND (
        :12 IS NULL
        OR UPPER(b.NOME_COMPLETO) LIKE :13
        OR UPPER(NVL(b.BILHETE_IDENTIDADE, '-')) LIKE :14
        OR UPPER(NVL(b.CURSO, '-')) LIKE :15
        OR UPPER(NVL(b.FACULDADE, '-')) LIKE :16
      )
  `;

  const countParams = [
    anoLectivo,   // :1
    anoLectivo,   // :2
    grau,         // :3
    grau,         // :4
    anoCurricular,// :5
    anoCurricular,// :6
    estado,       // :7
    estado,       // :8
    anoLectivo,   // :9
    estado,       // :10
    anoLectivo,   // :11
    searchValue,  // :12
    searchValue,  // :13
    searchValue,  // :14
    searchValue,  // :15
    searchValue,  // :16
  ];

  const [result, countResult] = await Promise.all([
    this.dataSource.query(sql, sqlParams),
    this.dataSource.query(countSql, countParams),
  ]);

  const total = Number(countResult[0]?.TOTAL ?? 0);

  const data = result.map((row: any, index: number) => ({
    numero: offset + index + 1,
    nome: row.NOME_COMPLETO,
    numero_bilhete: row.BILHETE_IDENTIDADE,
    sexo: row.SEXO,
    idade: row.IDADE,
    data_nascimento: row.DATA_NASCIMENTO,
    provincia: row.PROVINCIA,
    municipio: row.MUNICIPIO,
    pais_origem: row.PAIS,
    periodo_estudo: row.PERIODO_ESTUDO,
    unidade_organica: row.FACULDADE,
    nome_curso_inscrito_ensino_superior: row.CURSO,
    ano_frequencia: row.CODIGO_CLASSE,
    situacao_academica: row.SITUACAO_ACADEMICA,
    aproveitamento_anual: row.TAXA_APROVEITAMENTO,
  }));

  return {
    data,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit) || 1,
  };
}


  async resetPassword(body: ResetStudentPasswordDTO) {
    const sql = `SELECT
  TU."ID" as user_id
FROM FK2_TB_MATRICULAS M
INNER JOIN FK2_TB_ADMISSAO TA
  ON TA."CODIGO" = M."CODIGO_ALUNO"
INNER JOIN FK2_TB_PREINSCRICAO TP
  ON TP."CODIGO" = TA."PRE_INCRICAO"
INNER JOIN FK2_USERS TU
  ON TP."USER_ID" = TU."ID"
WHERE M."CODIGO" = :codigoMatricula`;

    const result = await this.dataSource.query(sql, {
      codigoMatricula: body.codigoMatricula,
    } as any);

    if (!result || result.length === 0) {
      throw new NotFoundException('Matrícula não encontrada');
    }
    const hash = await gerarHashExterno(body.senha);

    await this.dataSource.query(
      `
    UPDATE FK2_USERS
    SET "PASSWORD" = :hash
    WHERE "ID" = :user_id
    `,
      { hash: hash, user_id: toLowerCaseKeys(result[0]).user_id } as any,
    );

    return { message: 'Senha atualizada com sucesso' };
  }

  async updateContactos(body: UpdateStudentContactDTO) {
    const { codigoMatricula, email, contacto, contactoAlternativo } = body;

    if (!email && !contacto && !contactoAlternativo) {
      throw new BadRequestException(
        'Informe pelo menos um campo para atualizar',
      );
    }
    if (email) {
      const emailExiste = await this.dataSource.query(
        `
      SELECT 1 FROM FK2_TB_PREINSCRICAO
      WHERE "EMAIL" = :email
      `,
        { email } as any,
      );

      if (emailExiste.length > 0) {
        throw new BadRequestException('Email já está em uso');
      }
    }
    const fields: string[] = [];
    const params: any = { codigoMatricula };

    if (email) {
      fields.push(`TP."EMAIL" = :email`);
      params.email = email;
    }

    if (contacto) {
      fields.push(`TP."CONTACTOS_TELEFONICOS" = :contacto`);
      params.contacto = contacto;
    }

    if (contactoAlternativo) {
      fields.push(`TP."CONTACTO_DE_EMERGENCIA" = :contactoAlternativo`);
      params.contactoAlternativo = contactoAlternativo;
    }

    fields.push(`TP."UPDATED_AT" = SYSDATE`);

    const result = await this.dataSource.query(
      `
    UPDATE FK2_TB_PREINSCRICAO TP
    SET ${fields.join(', ')}
    WHERE TP."CODIGO" = (
      SELECT TA."PRE_INCRICAO"
      FROM FK2_TB_MATRICULAS M
      INNER JOIN FK2_TB_ADMISSAO TA
        ON TA."CODIGO" = M."CODIGO_ALUNO"
      WHERE M."CODIGO" = :codigoMatricula
    )
    `,
      params,
    );

    if (!result) {
      throw new NotFoundException('Matrícula não encontrada');
    }

    return { message: 'Contactos atualizados com sucesso' };
  }
  async updatePersonalData(body: UpdateStudentPersonalDataDTO) {
    const { codigoMatricula, ...data } = body;

    const fieldMapping: Record<string, string> = {
      nomeCompleto: 'NOME_COMPLETO',
      dataNascimento: 'DATA_NASCIMENTO',
      genero: 'SEXO',
      numeroBI: 'BILHETE_IDENTIDADE',
      dataEmissao: 'DATA_EMISSAO_BI',
      dataValidade: 'DATA_VALIDADE_BI',
      nacionalidade: 'CODIGO_NACIONALIDADE',
      nomePai: 'PAI',
      nomeMae: 'MAE',
      profissao: 'CODIGO_PROFISSAO',
      ocupacao: 'CODIGO_OCUPACAO',
      naturalidade: 'NATURALIDADE',
      morada: 'MORADA_COMPLETA',
    };

    const fields: string[] = [];
    const params: any = { codigoMatricula };

    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && fieldMapping[key]) {
        fields.push(`TP."${fieldMapping[key]}" = :${key}`);

        if (key.toLowerCase().includes('data') && data[key]) {
          params[key] = new Date(data[key]);
        } else {
          params[key] = data[key];
        }
      }
    });

    if (fields.length === 0) {
      throw new BadRequestException(
        'Nenhum campo válido para atualização foi fornecido',
      );
    }

    fields.push(`TP."UPDATED_AT" = SYSDATE`);

    const sql = `
    UPDATE FK2_TB_PREINSCRICAO TP
    SET ${fields.join(', ')}
    WHERE TP."CODIGO" = (
      SELECT TA."PRE_INCRICAO"
      FROM FK2_TB_MATRICULAS M
      INNER JOIN FK2_TB_ADMISSAO TA ON TA."CODIGO" = M."CODIGO_ALUNO"
      WHERE M."CODIGO" = :codigoMatricula
    )
  `;

    const result = await this.dataSource.query(sql, params);

    if (!result) {
      throw new NotFoundException(
        'Estudante não encontrado para a matrícula informada',
      );
    }

    return { message: 'Dados pessoais atualizados com sucesso' };
  }
  async activateRegistration(dto: ActivateRegistrationDTO, usuarioLogado: any) {
    const { codigoMatricula, anoLectivoId } = dto;

    if (!codigoMatricula || !anoLectivoId) {
      throw new BadRequestException('Código da matrícula e ano letivo são obrigatórios');
    }

    try {

      const sqlVerificarDiplomado = `
      SELECT 
        M."ESTADO_MATRICULA"
      FROM FK2_TB_MATRICULAS M
      WHERE M."CODIGO" = :codigoMatricula
    `;

      const matriculaAtual = await this.dataSource.query(sqlVerificarDiplomado, {
        codigoMatricula
      } as any);

      if (matriculaAtual.length === 0) {
        throw new NotFoundException('Matrícula não encontrada');
      }

      const status = matriculaAtual[0];

      // Se já estiver diplomado, não permite ativar novamente
      if (status.ESTADO_MATRICULA === 'Diplomado' ||
        status.ESTADO_MATRICULA === 'diplomado' ||
        status.ESTADO_MATRICULA === 'concluido') {

        throw new BadRequestException('Não é possível ativar esta matrícula. O aluno já está diplomado.');
      }
      // ====================== 1. BUSCAR ISENÇÕES DE PROPINA ATIVAS ======================
      const sqlBuscarPropinas = `
      SELECT 
        I.CODIGO as "codigoIsencao",
        S.DESCRICAO as "servico",
        S.PRECO as "valor",
        I.MES_TEMP_ID as "mesId",
        I.OBS as "observacao"
      FROM FK2_TB_ISENCOES I
      INNER JOIN FK2_TB_TIPO_SERVICOS S 
        ON S."CODIGO" = I."CODIGO_SERVICO"
      WHERE I.CODIGO_ANOLECTIVO = :anoLectivoId
        AND I.CODIGO_MATRICULA = :codigoMatricula
        AND UPPER(I.ESTADO_ISENSAO) = 'ACTIVO'
        AND UPPER(S.DESCRICAO) LIKE 'PROPINA%'
      ORDER BY I.CREATED_AT DESC
    `;
      const isencoesPropina = await this.dataSource.query(sqlBuscarPropinas, {
        codigoMatricula,
        anoLectivoId,
      } as any);

      console.log('Isenções encontradas:', isencoesPropina);

      // ====================== 2. DESATIVAR ISENÇÕES DE PROPINA ======================
      let isencoesDesativadas = 0;

      if (isencoesPropina.length > 0) {
        const ref_utilizado = { pk: usuarioLogado?.sub, desc: usuarioLogado?.name, corLetra: "black", disponivel: false };

        // Desativar as isenções
        const sqlDesativarPropinas = `
        UPDATE FK2_TB_ISENCOES I
        SET I."ESTADO_ISENSAO" = 'Inactivo',
            I."OBS" = 'Isenção de propina removida automaticamente durante a activação da matrícula.',
            I."REF_UTILIZADO" = :refUtilizado,
            I."UPDATED_AT" = SYSDATE
        WHERE I.CODIGO_ANOLECTIVO = :anoLectivoId
          AND I.CODIGO_MATRICULA = :codigoMatricula
          AND UPPER(I.ESTADO_ISENSAO) = 'ACTIVO'
          AND I."CODIGO_SERVICO" IN (
            SELECT S."CODIGO" 
            FROM FK2_TB_TIPO_SERVICOS S 
            WHERE UPPER(S."DESCRICAO") LIKE 'PROPINA%'
          )
      `;

        const result = await this.dataSource.query(sqlDesativarPropinas, {
          codigoMatricula,
          anoLectivoId,
          refUtilizado: JSON.stringify(ref_utilizado),
        } as any);

        console.log(result);


        isencoesDesativadas = result || 0;

        // ====================== 3. DESATIVAR FACTURAS E ITENS DE PROPINA ======================
        // Atualiza os ITEMS primeiro
        const sqlDesativarItems = `
        UPDATE FK2_FACTURA_ITEMS fi
        SET fi.ESTADO = 0
        WHERE fi.MES_TEMP_ID IN (
          SELECT I.MES_TEMP_ID 
          FROM FK2_TB_ISENCOES I
          WHERE I.CODIGO_ANOLECTIVO = :anoLectivoId
            AND I.CODIGO_MATRICULA = :codigoMatricula
            AND UPPER(I.ESTADO_ISENSAO) = 'INACTIVO' 
            AND I."CODIGO_SERVICO" IN (
              SELECT S."CODIGO" 
              FROM FK2_TB_TIPO_SERVICOS S 
              WHERE UPPER(S."DESCRICAO") LIKE 'PROPINA%'
            )
        )
        AND EXISTS (
          SELECT 1 FROM FK2_FACTURA f 
          WHERE f.CODIGO = fi.CODIGOFACTURA
            AND f.CODIGOMATRICULA = :codigoMatricula
            AND f.ANO_LECTIVO = :anoLectivoId
        )
      `;

        await this.dataSource.query(sqlDesativarItems, { codigoMatricula, anoLectivoId } as any);

        // Atualiza as FACTURAS
        const sqlDesativarFacturas = `
        UPDATE FK2_FACTURA f
        SET f.ESTADO = 0
        SET f.VALORISENTO = 0
        WHERE f.CODIGOMATRICULA = :codigoMatricula
          AND f.ANO_LECTIVO = :anoLectivoId
          AND EXISTS (
            SELECT 1 FROM FK2_FACTURA_ITEMS fi 
            WHERE fi.CODIGOFACTURA = f.CODIGO
              AND fi.MES_TEMP_ID IN (
                SELECT I.MES_TEMP_ID 
                FROM FK2_TB_ISENCOES I
                WHERE I.CODIGO_ANOLECTIVO = :anoLectivoId
                  AND I.CODIGO_MATRICULA = :codigoMatricula
                  AND I."CODIGO_SERVICO" IN (
                    SELECT S."CODIGO" FROM FK2_TB_TIPO_SERVICOS S 
                    WHERE UPPER(S."DESCRICAO") LIKE 'PROPINA%'
                  )
              )
          )
      `;

        await this.dataSource.query(sqlDesativarFacturas, { codigoMatricula, anoLectivoId } as any);
      }

      // ====================== 4. ATIVAR A MATRÍCULA ======================
      const sqlAtivarMatricula = `
      UPDATE FK2_TB_MATRICULAS M
      SET M."ESTADO_MATRICULA" = 'activo',
          M."UPDATED_AT" = SYSDATE
      WHERE M."CODIGO" = :codigoMatricula
    `;

      const resultMatricula = await this.dataSource.query(sqlAtivarMatricula, {
        codigoMatricula
      } as any);

      if (resultMatricula[1] === 0) {
        throw new NotFoundException('Matrícula não encontrada');
      }

      // ====================== RESPOSTA ======================
      return {
        sucesso: true,
        mensagem: 'Matrícula ativada com sucesso',
        isencoesDePropinaDesativadas: isencoesDesativadas,
        detalhes: isencoesPropina.length > 0
          ? `${isencoesDesativadas} isenção(ões) de propina foram desativadas e as faturas relacionadas foram anuladas.`
          : 'Nenhuma isenção de propina ativa foi encontrada.'
      };

    } catch (error) {
      console.error('Erro ao ativar matrícula:', error);
      throw new BadRequestException(error || 'Erro ao ativar matrícula');
    }
  }

  async academicHistory(dto: AcademicHistoryDTO) {
    const { anoLectivoId, matriculaId, tipoProvaId, tipoAvaliacaoId, classeId, search, page = 1, limit = 10 } = dto;

    const offset = (page - 1) * limit;

    const query = `
    SELECT
      c.DESIGNACAO AS curso,
      d.DESIGNACAO AS unidade_curricular,
      TAV.DESIGNACAO AS tipo_avaliacao,
      ANL.DESIGNACAO AS ano_lectivo,
      CL.DESIGNACAO AS ano_curricular,
      AVA.NOTA_ANTERIOR AS nota_anterior,
      tp2.NOME_COMPLETO AS utilizador,
      AVA.OBSERVACAO AS OBSERVACAO,
      AVA.NOTA AS NOTA,
      MIN(AVA.CREATED_AT) AS DATALANCAMENTO,
      MIN(AVA.UPDATE_AT) AS DATADEATUALIZACAO

    FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
    LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES AVA
      ON AVA.GRADE_CURRICULAR_ALUNO = GCA.CODIGO
    LEFT JOIN FK2_TB_TIPO_AVALIACAO TAV ON TAV.CODIGO = AVA.TIPO_AVALIACAO
    LEFT JOIN FK2_TB_ANO_LECTIVO ANL ON ANL.CODIGO = GCA.CODIGO_ANO_LECTIVO
    LEFT JOIN FK2_MCA_TB_UTILIZADOR mtu
      ON mtu.PK_UTILIZADOR = JSON_VALUE(AVA.REF_UTILIZADOR, '$.pk')
    LEFT JOIN FK2_TB_PESSOA tp2 ON tp2.PK_PESSOA = JSON_VALUE(mtu.REF_PESSOA, '$.pk')
    LEFT JOIN FK2_TB_MATRICULAS MAT ON MAT.CODIGO = GCA.CODIGO_MATRICULA
    LEFT JOIN FK2_TB_GRADE_CURRICULAR GC ON GC.CODIGO = GCA.CODIGO_GRADE_CURRICULAR
    LEFT JOIN FK2_TB_CLASSES CL ON CL.CODIGO = GC.CODIGO_CLASSE
    LEFT JOIN FK2_TB_CURSOS c ON c.CODIGO = GC.CODIGO_CURSO
    LEFT JOIN FK2_TB_DISCIPLINAS d ON d.CODIGO = GC.CODIGO_DISCIPLINA
    LEFT JOIN FK2_TB_ADMISSAO ADM ON ADM.CODIGO = MAT.CODIGO_ALUNO
    LEFT JOIN FK2_TB_PREINSCRICAO PRE ON PRE.CODIGO = ADM.PRE_INCRICAO

    WHERE
      GCA.CODIGO_ANO_LECTIVO = :anoLectivoId
      AND MAT.CODIGO = :matriculaId
      AND AVA.TIPO_AVALIACAO IS NOT NULL
      ${tipoProvaId ? 'AND AVA.TIPO_DE_PROVA = :tipoProvaId' : ''}
      ${tipoAvaliacaoId ? 'AND AVA.TIPO_AVALIACAO = :tipoAvaliacaoId' : ''}
      ${classeId ? 'AND GC.CODIGO_CLASSE = :classeId' : ''}
      ${search ? 'AND UPPER(d.DESIGNACAO) LIKE UPPER(:search)' : ''}

    GROUP BY
      GCA.CODIGO, MAT.CODIGO, PRE.NOME_COMPLETO,
      AVA.CODIGO, AVA.OBSERVACAO, AVA.NOTA, c.DESIGNACAO, d.DESIGNACAO,
      ANL.DESIGNACAO, TAV.DESIGNACAO, CL.DESIGNACAO, tp2.NOME_COMPLETO, AVA.NOTA_ANTERIOR

    ORDER BY PRE.NOME_COMPLETO
    OFFSET :offset ROWS FETCH NEXT :fetchLimit ROWS ONLY
  `;

    const params: Record<string, any> = {
      anoLectivoId,
      matriculaId,
      offset,
      fetchLimit: limit + 1,
    };

    if (tipoProvaId) params.tipoProvaId = tipoProvaId;
    if (tipoAvaliacaoId) params.tipoAvaliacaoId = tipoAvaliacaoId;
    if (classeId) params.classeId = classeId;
   
    
    if (search) params.search = `%${search}%`;

    const result = await this.dataSource.query(query, params as any);

    const hasNextPage = result.length > limit;
    if (hasNextPage) result.pop();

    return {
      success: true,
      data: await toLowerCaseKeys(result),
      page,
      limit,
      hasNextPage,
    };
  }

async academicHistoryEquivalencia(dto: AcademicHistoryEquivalenciaDTO) {
  const {
    anoLectivoId,
    matriculaId,
    classeId,
    search,
    page = 1,
    limit = 10,
  } = dto;

  const offset = (page - 1) * limit;

  const query = `
    SELECT 
      al.codigo,
      d.DESIGNACAO AS unidade_curricular,
      cla.DESIGNACAO AS classes,
      MAX(al.NOTA) AS nota,
      an.DESIGNACAO AS ano_lectivo,
      c.DESIGNACAO AS curso,
      al.EPOCA as epoca

    FROM FK2_TB_GRADE_CURRICULAR_ALUNO al

    INNER JOIN FK2_TB_GRADE_CURRICULAR ga
      ON ga.codigo = al.CODIGO_GRADE_CURRICULAR 

    INNER JOIN FK2_TB_DISCIPLINAS d 
      ON d.codigo = ga.CODIGO_DISCIPLINA

    INNER JOIN FK2_TB_CLASSES cla 
      ON cla.CODIGO = ga.CODIGO_CLASSE

    INNER JOIN FK2_TB_ANO_LECTIVO an
      ON an.CODIGO = al.CODIGO_ANO_LECTIVO

    INNER JOIN FK2_TB_CURSOS c
      ON c.CODIGO = ga.CODIGO_CURSO

    WHERE 
      al.EQUIVALENCIA = 1
      AND al.CODIGO_MATRICULA = :matriculaId
      ${anoLectivoId ? 'AND al.CODIGO_ANO_LECTIVO = :anoLectivoId' : ''}
      ${classeId ? 'AND ga.CODIGO_CLASSE = :classeId' : ''}
      ${search ? 'AND UPPER(d.DESIGNACAO) LIKE UPPER(:search)' : ''}

    GROUP BY 
      al.codigo,
      d.DESIGNACAO,
      cla.DESIGNACAO,
      an.DESIGNACAO,
      c.DESIGNACAO,
      al.EPOCA

    ORDER BY 
      cla.DESIGNACAO,
      d.DESIGNACAO ASC

    OFFSET :offset ROWS FETCH NEXT :fetchLimit ROWS ONLY
  `;

  const params: Record<string, any> = {
    matriculaId,
    offset,
    fetchLimit: limit + 1,
  };

  if (anoLectivoId) params.anoLectivoId = anoLectivoId;
  if (classeId) params.classeId = classeId;
  if (search) params.search = `%${search}%`;

  const result = await this.dataSource.query(query, params as any);

  const hasNextPage = result.length > limit;
  if (hasNextPage) result.pop();

  return {
    success: true,
    data: await toLowerCaseKeys(result),
    page,
    limit,
    hasNextPage,
  };
}

async academicHistoryMigracaoDados(dto: AcademicHistoryMigracaoDadosDTO) {
  const {
    anoLectivoId,
    matriculaId,
    classeId,
    search,
    page = 1,
    limit = 10,
  } = dto;

  const offset = (page - 1) * limit;

  const query = `
    SELECT 
      al.codigo,
      d.DESIGNACAO AS unidade_curricular,
      cla.DESIGNACAO AS classes,
      MAX(al.NOTA) AS nota,
      an.DESIGNACAO AS ano_lectivo,
      c.DESIGNACAO AS curso,
      al.EPOCA as epoca

    FROM FK2_TB_GRADE_CURRICULAR_ALUNO al

    INNER JOIN FK2_TB_GRADE_CURRICULAR ga
      ON ga.codigo = al.CODIGO_GRADE_CURRICULAR 

    INNER JOIN FK2_TB_DISCIPLINAS d 
      ON d.codigo = ga.CODIGO_DISCIPLINA

    INNER JOIN FK2_TB_CLASSES cla 
      ON cla.CODIGO = ga.CODIGO_CLASSE

    INNER JOIN FK2_TB_ANO_LECTIVO an
      ON an.CODIGO = al.CODIGO_ANO_LECTIVO

    INNER JOIN FK2_TB_CURSOS c
      ON c.CODIGO = ga.CODIGO_CURSO

    WHERE 
      al.CANAL = 8
      AND al.CODIGO_MATRICULA = :matriculaId
      AND al.CODIGO_STATUS_GRADE_CURRICULAR = 3
      ${anoLectivoId ? 'AND al.CODIGO_ANO_LECTIVO = :anoLectivoId' : ''}
      ${classeId ? 'AND ga.CODIGO_CLASSE = :classeId' : ''}
      ${search ? 'AND UPPER(d.DESIGNACAO) LIKE UPPER(:search)' : ''}

    GROUP BY 
      al.codigo,
      d.DESIGNACAO,
      cla.DESIGNACAO,
      an.DESIGNACAO,
      c.DESIGNACAO,
      al.EPOCA,
      al.CODIGO_STATUS_GRADE_CURRICULAR

    ORDER BY 
      cla.DESIGNACAO,
      d.DESIGNACAO ASC

    OFFSET :offset ROWS FETCH NEXT :fetchLimit ROWS ONLY
  `;

  const params: Record<string, any> = {
    matriculaId,
    offset,
    fetchLimit: limit + 1,
  };

  if (anoLectivoId) params.anoLectivoId = anoLectivoId;
  if (classeId) params.classeId = classeId;
  if (search) params.search = `%${search}%`;

  const result = await this.dataSource.query(query, params as any);

  const hasNextPage = result.length > limit;
  if (hasNextPage) result.pop();

  return {
    success: true,
    data: await toLowerCaseKeys(result),
    page,
    limit,
    hasNextPage,
  };
}


async updateHorarioGradeCurricular({codigoGradeCurricularAluno, horarioID}: {codigoGradeCurricularAluno: number, horarioID: number}) {
  const gradeCurricularID = codigoGradeCurricularAluno;
  const STATUS_PERMITIDO = 2;
  console.log({codigoGradeCurricularAluno, horarioID})

  const [gradeResult, statusResult, horarioResult] = await Promise.all([
    this.dataSource.query(
      `
      SELECT 
        al.codigo as codigo_grade_curricular_aluno,
        al.REF_HORARIO as ref_horario,
        al.CODIGO_STATUS_GRADE_CURRICULAR as codigo_status_grade_curricular
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
      WHERE al.CODIGO = :1
      
      `,
      [gradeCurricularID],
    ),

    this.dataSource.query(
      `
      SELECT 
        sgc.DESIGNACAO as status_nome
      FROM FK2_TB_STATUS_GRADE_CURRICULAR sgc
      WHERE sgc.codigo = :1
      `,
      [STATUS_PERMITIDO],
    ),

    this.dataSource.query(
      `
      SELECT 
        hr.pk_horario as pk,
        hr.designacao as designacao
      FROM FK2_MGH_TB_HORARIO hr
      WHERE hr.pk_horario = :1
      `,
      [horarioID],
    ),
  ]);

  const [gradeCurricular] = toLowerCaseKeys(gradeResult);
  const [statusGradeCurricular] = toLowerCaseKeys(statusResult);
  const [horario] = toLowerCaseKeys(horarioResult);


  if (!gradeCurricular) {
    throw new BadRequestException('Grade curricular não encontrada');
  }

  if (!horario) {
    throw new BadRequestException('Horário não encontrado');
  }

  console.log({gradeCurricular});

  if (gradeCurricular.codigo_status_grade_curricular !== STATUS_PERMITIDO) {
    throw new BadRequestException(
      `Apenas grades curriculares com estado ${statusGradeCurricular?.status_nome} podem ter horário`,
    );
  }

  const REF_HORARIO = JSON.stringify({pk: horario.pk, desc: horario.designacao});

  await this.dataSource.query(
    `
    UPDATE FK2_TB_GRADE_CURRICULAR_ALUNO
    SET REF_HORARIO = :1
    WHERE CODIGO = :2
    `,
    [REF_HORARIO, gradeCurricularID],
  );
 
 

  return {
    message: 'Horário da grade curricular atualizado com sucesso',
  };
}

async deleteGrade({codigoGradeCurricularAluno}: {codigoGradeCurricularAluno: number}) {
  console.log({codigoGradeCurricularAluno})
  const gradeCurricularResult = await this.dataSource.query(
    `
    SELECT 
      al.CODIGO_STATUS_GRADE_CURRICULAR as codigo_status_grade_curricular
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
    WHERE al.CODIGO = :1
    `,
    [codigoGradeCurricularAluno],
  );
  console.log({gradeCurricularResult})
  const [gradeCurricular] = toLowerCaseKeys(gradeCurricularResult);

  if (!gradeCurricular) {
    throw new BadRequestException('Grade curricular não encontrada');
  }

  if (gradeCurricular.codigo_status_grade_curricular === 3) {
    throw new BadRequestException(
      'Não é possível deletar grade curricular Concluida',
    );
  }


  await this.dataSource.query(
    `
    UPDATE FK2_TB_GRADE_CURRICULAR_ALUNO
    SET CODIGO_STATUS_GRADE_CURRICULAR = 5
    WHERE CODIGO = :1
    `,
    [codigoGradeCurricularAluno],
  );
  return {
    message: 'Grade curricular deletada com sucesso',
  };
}

async restoreGrade({codigoGradeCurricularAluno}: {codigoGradeCurricularAluno: number}) {
  const gradeCurricularResult = await this.dataSource.query(
    `
    SELECT 
      al.CODIGO_STATUS_GRADE_CURRICULAR as codigo_status_grade_curricular
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
    WHERE al.CODIGO = :1
    `,
    [codigoGradeCurricularAluno],
  );

  const [gradeCurricular] = toLowerCaseKeys(gradeCurricularResult);

  if (!gradeCurricular) {
    throw new BadRequestException('Grade curricular não encontrada');
  }

  await this.dataSource.query(
    `
    UPDATE FK2_TB_GRADE_CURRICULAR_ALUNO
    SET CODIGO_STATUS_GRADE_CURRICULAR = 2
    WHERE CODIGO = :1
    `,
    [codigoGradeCurricularAluno],
  );
return {
  message: 'Grade curricular restaurada com sucesso',
};
}


async definirEspecialidade(dto: DefinirEspecialidadeDTO) {
  const { codigoMatricula, codigoCursoEspecialidade } = dto;

  const matriculaResult = await this.dataSource.query(
    `SELECT ESTADO_MATRICULA FROM FK2_TB_MATRICULAS WHERE CODIGO = :1`,
    [codigoMatricula],
  );

  const matriculas = toLowerCaseKeys(matriculaResult);

 
  if (!matriculas || matriculas.length === 0) {
    throw new NotFoundException('Matrícula não encontrada');
  }

  const matricula = matriculas[0];

 
  if (matricula.estado_matricula?.toLowerCase() === 'diplomado') {
    throw new BadRequestException('Não é possível definir especialidade para aluno diplomado');
  }
    await this.dataSource.query(
      `
      UPDATE FK2_TB_MATRICULAS
      SET CODIGO_CURSO = :1,
          UPDATED_AT = CURRENT_TIMESTAMP
      WHERE CODIGO = :2
      `,
      [codigoCursoEspecialidade, codigoMatricula],
    );

    return {
      message: 'Especialidade definida com sucesso',
    };
 
}



async changeCourse(dto: ChangeCourseDTO) {
    const { PoloId, matriculaId, cursoId } = dto;
     let  mudarCurso = true;
     let            buscarHorario = true;
    const anoCorrente = await this.anoLectivoUtil.getAnoAtualId();
    if (!anoCorrente) {
      throw new BadRequestException('Ano letivo atual não encontrado');
    }

    if (!matriculaId) {
      throw new BadRequestException('Código da matrícula é obrigatório');
    }
    if (!PoloId && !cursoId) {
      throw new BadRequestException('Polo ou curso deve ser informado para a alteração');
    }
    const matriculaDetails = await this.getMatriculaDetails(matriculaId);
    const confirmationExists = await this.confirmationExists(matriculaId, anoCorrente);
    if (confirmationExists || matriculaDetails.estado.toLowerCase() === 'activo') {
      return {
        message: 'Funcionalidade de mudança de curso ainda não implementada',
        matriculaDetails,
        confirmationExists
      };
    
    } else {
      return {
        message: 'Matrícula não ativa e sem confirmação para o ano letivo atual. A troca de curso não pode ser realizada.',
        matriculaDetails,
        confirmationExists
      };

    }




  }

  private async getMatriculaDetails(codigoMatricula: number) {
    const sql = `
    SELECT
      m.codigo               AS codigo_matricula,
      m.ESTADO_MATRICULA     AS estado,
      p.NOME_COMPLETO        AS nome_completo,
      p.BILHETE_IDENTIDADE   AS bi,
      c.designacao           AS curso,
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
  private async confirmationExists(codigoMatricula: number, anoLectivoId: number): Promise<boolean> {
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


}
