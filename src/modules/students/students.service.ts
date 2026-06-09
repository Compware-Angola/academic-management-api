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
import { FindStudentClassInfoDTO } from './dto/find-student-info.dto';
import { DefinirEspecialidadeDTO } from './dto/definir-especialidade.dto';
import { formatarDataExtenso, notaExtenso } from '../util/diploma.util';
import { GerarCertificadoDto } from './dto/gerar-certificado.dto';
import { ListarDiplomadosDTO } from './dto/listar-diplomados-dto';
import { StudentsResultPlanService } from './students-result-plan.service';

@Injectable()
export class StudentsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly anoLectivoUtil: AnoLectivoUtil,
    private readonly planStudent: StudentsResultPlanService,
  ) { }

  async getProfileEstatistic(
    codigoMatricula: number,
    anoLectivo?: number,
  ): Promise<any> {
    const anoLectivoFilter = anoLectivo
      ? `AND ftgca.CODIGO_ANO_LECTIVO = :anoLectivo`
      : `AND ftgca.CODIGO_ANO_LECTIVO = (
        SELECT MAX(CODIGO_ANO_LECTIVO)
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO
        WHERE CODIGO_MATRICULA = m.CODIGO
          AND CODIGO_STATUS_GRADE_CURRICULAR IN (2, 3)
    )`;

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
      p.SALDO                AS saldo_atual,
      p.SALDO_RESET          AS saldo_reset,
      p.SALDO_RESET_ANTER    AS saldo_reset_anterior,
      u.FOTO                 AS foto,

      -- Verifica se o curso é especialidade
      CASE WHEN ce.CODIGO_CURSO_ESPECIALIDADE IS NOT NULL THEN 1 ELSE 0 END AS is_especialidade,

      -- Classe com mais grades curriculares inscritas
      (
          SELECT cl.DESIGNACAO
          FROM FK2_TB_GRADE_CURRICULAR_ALUNO ftgca
          LEFT JOIN FK2_TB_GRADE_CURRICULAR ftgc
              ON ftgc.CODIGO = ftgca.CODIGO_GRADE_CURRICULAR
          LEFT JOIN FK2_TB_CLASSES cl
              ON cl.CODIGO = ftgc.CODIGO_CLASSE
          WHERE ftgca.CODIGO_MATRICULA = m.CODIGO
            AND ftgca.CODIGO_STATUS_GRADE_CURRICULAR IN (2, 3)
            ${anoLectivoFilter}
          GROUP BY cl.CODIGO, cl.DESIGNACAO
          ORDER BY COUNT(ftgca.CODIGO) DESC
          FETCH FIRST 1 ROWS ONLY
      ) AS classe,

      (
          SELECT cl.CODIGO
          FROM FK2_TB_GRADE_CURRICULAR_ALUNO ftgca
          LEFT JOIN FK2_TB_GRADE_CURRICULAR ftgc
              ON ftgc.CODIGO = ftgca.CODIGO_GRADE_CURRICULAR
          LEFT JOIN FK2_TB_CLASSES cl
              ON cl.CODIGO = ftgc.CODIGO_CLASSE
          WHERE ftgca.CODIGO_MATRICULA = m.CODIGO
            AND ftgca.CODIGO_STATUS_GRADE_CURRICULAR IN (2, 3)
            ${anoLectivoFilter}
          GROUP BY cl.CODIGO, cl.DESIGNACAO
          ORDER BY COUNT(ftgca.CODIGO) DESC
          FETCH FIRST 1 ROWS ONLY
      ) AS classe_codigo,

      -- Confirmação mais alta (usada quando curso é especialidade)
      (
          SELECT MAX(conf.CLASSE)
          FROM FK2_TB_CONFIRMACOES conf
          WHERE conf.CODIGO_MATRICULA = m.CODIGO
      ) AS classe_confirmacao_max

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
  LEFT JOIN FK2_TB_CURSO_ESPECIALIDADE ce
      ON ce.CODIGO_CURSO_ESPECIALIDADE = c.CODIGO
  WHERE m.codigo = :codigoMatricula
`;

    const queryParams: any = { codigoMatricula };

    if (anoLectivo) {
      queryParams.anoLectivo = anoLectivo;
    }

    const result = await this.dataSource.query(sql, queryParams);

    if (!result || result.length === 0) return null;

    const row = result[0];

    const isEspecialidade = row.IS_ESPECIALIDADE === 1;

    // Se for especialidade, vai buscar a designação da classe com base na confirmação mais alta
    if (isEspecialidade && row.CLASSE_CONFIRMACAO_MAX != null) {
      const classeResult = await this.dataSource.query(
        `SELECT DESIGNACAO FROM FK2_TB_CLASSES WHERE CODIGO = :codigo`,
        { codigo: row.CLASSE_CONFIRMACAO_MAX } as any,
      );

      if (classeResult && classeResult.length > 0) {
        row.CLASSE_CODIGO = row.CLASSE_CONFIRMACAO_MAX;
        row.CLASSE = classeResult[0].DESIGNACAO;
      }
    }

    delete row.IS_ESPECIALIDADE;
    delete row.CLASSE_CONFIRMACAO_MAX;

    return toLowerCaseKeys(row) || null;
  }
  async getSugestoes(search: string): Promise<any[]> {
    if (!search || search.trim().length < 2) {
      return [];
    }

    const anoLectivo = await this.anoLectivoUtil.getAnoAtualId();
    const semestre =
      (await this.anoLectivoUtil.getSemestreAtual()).semestre ?? 1;

    const sql = `
    SELECT
        m.CODIGO               AS codigo_matricula,
        p.BILHETE_IDENTIDADE   AS bi,
        p.NOME_COMPLETO        AS nome_completo,
        c.DESIGNACAO           AS curso,
        pe.DESIGNACAO          AS periodo,
        m.ESTADO_MATRICULA     AS estado,

        CASE
          WHEN EXISTS (
            SELECT 1
            FROM FK2_TB_BOLSEIROS b
            WHERE b.CODIGO_MATRICULA = m.CODIGO
              AND b.CODIGO_ANOLECTIVO = :anoLectivo
              AND b.SEMESTRE = :semestre
          )
          THEN 1
          ELSE 0
        END AS is_bolseiro

    FROM FK2_TB_MATRICULAS m

    INNER JOIN FK2_TB_ADMISSAO a
      ON a.CODIGO = m.CODIGO_ALUNO

    INNER JOIN FK2_TB_PREINSCRICAO p
      ON p.CODIGO = a.PRE_INCRICAO

    INNER JOIN FK2_TB_CURSOS c
      ON c.CODIGO = m.CODIGO_CURSO

    INNER JOIN FK2_TB_PERIODOS pe
      ON pe.CODIGO = p.CODIGO_TURNO

    WHERE
         TO_CHAR(m.CODIGO) LIKE :search
      OR p.BILHETE_IDENTIDADE LIKE :search
      OR LOWER(c.DESIGNACAO) LIKE LOWER(:search)
      OR LOWER(p.NOME_COMPLETO) LIKE LOWER(:search)

    FETCH FIRST 10 ROWS ONLY
  `;

    const result = await this.dataSource.query(
      sql,
      {
        search: `%${search}%`,
        anoLectivo,
        semestre,
      } as any,
    );

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
  async findStudentClassInfo(filters: FindStudentClassInfoDTO) {
    const { numeroDeMatricula, anoLectivo } = filters;

    const params: any = {};
    const conditions: string[] = ['1=1'];

    if (numeroDeMatricula) {
      conditions.push(`ftgca.CODIGO_MATRICULA = :numeroDeMatricula`);
      params.numeroDeMatricula = numeroDeMatricula;
    }

    if (anoLectivo) {
      conditions.push(`ftgca.CODIGO_ANO_LECTIVO = :anoLectivo`);
      params.anoLectivo = anoLectivo;
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
    SELECT
        -- Dados da Classe
        cl.CODIGO                   AS CODIGO_CLASSE,
        cl.DESIGNACAO               AS CLASSE,
        COUNT(ftgca.CODIGO)         AS TOTAL_GRADES_INSCRITAS,

        -- Dados da Matrícula
        m.CODIGO                    AS CODIGO_MATRICULA,
        m.ESTADO_MATRICULA          AS ESTADO,

        -- Dados Pessoais
        p.NOME_COMPLETO             AS NOME_COMPLETO,
        p.BILHETE_IDENTIDADE        AS BI,
        p.EMAIL                     AS EMAIL,
        p.CONTACTOS_TELEFONICOS     AS CONTACTO,
        p.CONTACTO_DE_EMERGENCIA    AS CONTACTO_ALTERNATIVO,
        p.DATA_NASCIMENTO           AS DATA_NASCIMENTO,
        p.DATA_EMISSAO_BI           AS DATA_EMISSAO_BI,
        p.DATA_VALIDADE_BI          AS DATA_VALIDADE_BI,
        p.PAI                       AS PAI,
        p.MAE                       AS MAE,
        p.NATURALIDADE              AS NATURALIDADE,
        p.ESTADO_CIVIL              AS ESTADO_CIVIL,
        p.SEXO                      AS SEXO,
        p.MORADA_COMPLETA           AS MORADA,

        -- Nacionalidade
        nac.DESIGNACAO              AS NACIONALIDADE,

        -- Curso e Faculdade
        c.CODIGO                    AS CURSO_CODIGO,
        c.DESIGNACAO                AS CURSO,
        fac.DESIGNACAO              AS FACULDADE,

        -- Período / Turno
        pe.CODIGO                   AS PERIODO_CODIGO,
        pe.DESIGNACAO               AS PERIODO,

        -- Grau e Regime
        tpc.DESIGNACAO              AS GRAU,
        pr.DESIGNACAO               AS REGIME,

        -- Foto
        u.FOTO                      AS FOTO,

        -- Ano Lectivo
        alt.DESIGNACAO              AS ANO_LECTIVO,
        alt.STATUS_                 AS STATUS_LECTIVO,
        alt.ESTADO                  AS STATUS_LECTIVO2,

        -- conclusao
         cca.DATA_CONCLUSAO        AS DATA_CONCLUSAO ,
        cca.NOTA                    AS  NOTA_OBTIDA

    FROM FK2_TB_GRADE_CURRICULAR_ALUNO ftgca
        LEFT JOIN FK2_TB_GRADE_CURRICULAR ftgc
            ON ftgc.CODIGO = ftgca.CODIGO_GRADE_CURRICULAR
        LEFT JOIN FK2_TB_CLASSES cl
            ON cl.CODIGO = ftgc.CODIGO_CLASSE
        LEFT JOIN FK2_TB_ANO_LECTIVO alt
            ON alt.CODIGO = ftgca.CODIGO_ANO_LECTIVO

        INNER JOIN FK2_TB_MATRICULAS m
            ON m.CODIGO = ftgca.CODIGO_MATRICULA
        INNER JOIN FK2_TB_ADMISSAO a
            ON a.CODIGO = m.CODIGO_ALUNO
        INNER JOIN FK2_TB_PREINSCRICAO p
            ON p.CODIGO = a.PRE_INCRICAO
        INNER JOIN FK2_USERS u
            ON u.ID = p.USER_ID
        INNER JOIN FK2_TB_CURSOS c
            ON c.CODIGO = m.CODIGO_CURSO
        INNER JOIN FK2_TB_FACULDADE fac
            ON fac.CODIGO = c.FACULDADE_ID
        INNER JOIN FK2_TB_PERIODOS pe
            ON pe.CODIGO = p.CODIGO_TURNO
        INNER JOIN FK2_TB_NACIONALIDADES nac
            ON nac.CODIGO = p.CODIGO_NACIONALIDADE
        INNER JOIN FK2_TB_TIPO_CANDIDATURA tpc
            ON tpc.ID = p.CODIGO_TIPO_CANDIDATURA
        INNER JOIN FK2_TB_PERIODOS pr
            ON pr.CODIGO = p.CODIGO_TURNO
               LEFT JOIN FK2_CONCLUSAO_CURSO_ALUNO cca
      ON CCA.CODIGO_MATRICULA = m.CODIGO

    WHERE ${whereClause}

    GROUP BY
        cl.CODIGO, cl.DESIGNACAO,
        m.CODIGO, m.ESTADO_MATRICULA,
        p.NOME_COMPLETO, p.BILHETE_IDENTIDADE, p.EMAIL,
        p.CONTACTOS_TELEFONICOS, p.CONTACTO_DE_EMERGENCIA,
        p.DATA_NASCIMENTO, p.DATA_EMISSAO_BI, p.DATA_VALIDADE_BI,
        p.PAI, p.MAE,
        p.NATURALIDADE, p.ESTADO_CIVIL, p.SEXO,
        p.MORADA_COMPLETA,
        nac.DESIGNACAO,
        c.CODIGO, c.DESIGNACAO,
        fac.DESIGNACAO,
        pe.CODIGO, pe.DESIGNACAO,
        tpc.DESIGNACAO,
        pr.DESIGNACAO,
        u.FOTO,
        alt.DESIGNACAO,
        alt.STATUS_,
        alt.ESTADO,
         cca.NOTA ,
          cca.DATA_CONCLUSAO


    ORDER BY TOTAL_GRADES_INSCRITAS DESC
    FETCH FIRST 1 ROWS ONLY
  `;

    const result = await this.dataSource.query(sql, params);

    if (!result || result.length === 0) return null;

    const [data] = await toLowerCaseKeys(result);

    return data;
  }

  async listarMapaAnualFinalistas(filter: FilterMapaAnualFinalistasDto) {
    const { page = 1, limit = 10, anoLectivo = 0, grau = 0, search } = filter;

    if (!anoLectivo || anoLectivo === 0) {
      throw new BadRequestException('O ano lectivo é obrigatório');
    }

    const offset = (page - 1) * limit;

    const baseParams: Record<string, any> = {
      anoLectivo,
      grau,
      grau_zero: grau,
    };

    let searchClause = '';
    if (search && search.trim()) {
      searchClause = `
      AND (
        UPPER(b.NOME) LIKE :search
        OR UPPER(NVL(b.NUM_BILHETE, '-')) LIKE :search
      )
    `;
      baseParams.search = `%${search.trim().toUpperCase()}%`;
    }

    const sql = `
  SELECT *
  FROM (
    SELECT
      q.*,
      ROW_NUMBER() OVER (ORDER BY q.NOME_COMPLETO ASC) AS RN
    FROM (
      SELECT DISTINCT
        tp.NOME_COMPLETO,
        tp.BILHETE_IDENTIDADE,
        tp.SEXO AS GENERO,
        (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM tp.DATA_NASCIMENTO)) AS IDADE,
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
        tc.DURACAO AS DURACAO_CURSO,
        ROUND(
          (
            SELECT SUM(tgca.NOTA)
            FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
            INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
              ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
            WHERE tgca.CODIGO_MATRICULA = tm.CODIGO
              AND tgca.CODIGO_STATUS_GRADE_CURRICULAR = 3
              AND tgc.STATUS_ NOT IN (0, 3)
              AND tm.CODIGO_CURSO = tgc.CODIGO_CURSO
          ) / NULLIF((
            SELECT COUNT(tgca.CODIGO_GRADE_CURRICULAR)
            FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
            INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
              ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
            WHERE tgca.CODIGO_MATRICULA = tm.CODIGO
              AND tgca.CODIGO_STATUS_GRADE_CURRICULAR = 3
              AND tgc.STATUS_ NOT IN (0, 3)
              AND tm.CODIGO_CURSO = tgc.CODIGO_CURSO
          ), 0),
          0
        ) AS MEDIA_FINAL
      FROM FK2_TB_MATRICULAS tm
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON tp.CODIGO = ta.PRE_INCRICAO
      INNER JOIN FK2_TB_PROVINCIAS tpr
        ON tpr.CODIGO = tp.CODIGO_PROVINCIA_RESIDENCIA_PERMANENTE
      INNER JOIN FK2_TB_NACIONALIDADES tn
        ON tn.CODIGO = tp.CODIGO_NACIONALIDADE
      INNER JOIN FK2_TB_MUNICIPIOS tm2
        ON tm2.CODIGO = tp.CODIGO_MUNICIPIO
      INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
       AND (tc.TIPO_CANDIDATURA = :grau OR :grau_zero = 0)
      INNER JOIN FK2_TB_FACULDADE tf
        ON tf.CODIGO = tc.FACULDADE_ID
      WHERE (
        (
          (
            SELECT COUNT(tpcg.CODIGO_GRADE_CURRICULAR)
            FROM FK2_TB_PLANO_CURRICULAR_GRADE tpcg
            INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc
              ON tpcg.CODIGO_PLANO_CURRICULAR_CURSO = tpcc.CODIGO
            WHERE tpcc.CODIGO_CURSO = tm.CODIGO_CURSO
              AND tpcc.CODIGO_ANO_LECTIVO = :anoLectivo
          ) +
          (
            SELECT COUNT(tpcg.CODIGO_GRADE_CURRICULAR)
            FROM FK2_TB_PLANO_CURRICULAR_GRADE tpcg
            INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc
              ON tpcg.CODIGO_PLANO_CURRICULAR_CURSO = tpcc.CODIGO
            INNER JOIN FK2_TB_PREINSCRICAO tp2
              ON ta.PRE_INCRICAO = tp2.CODIGO
            WHERE tpcc.CODIGO_CURSO = tp2.CURSO_CANDIDATURA
              AND tpcc.CODIGO_ANO_LECTIVO = :anoLectivo
              AND tp2.CURSO_CANDIDATURA != tm.CODIGO_CURSO
          )
        ) -
        (
          SELECT COUNT(tgca.CODIGO_GRADE_CURRICULAR)
          FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
          INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
            ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
          WHERE tgca.CODIGO_MATRICULA = tm.CODIGO
            AND tgca.CODIGO_STATUS_GRADE_CURRICULAR = 3
            AND tgc.STATUS_ NOT IN (0, 3)
            AND tm.CODIGO_CURSO = tgc.CODIGO_CURSO
        )
      ) = 1
      ${search && search.trim()
        ? `
        AND (
          UPPER(tp.NOME_COMPLETO) LIKE :search
          OR UPPER(NVL(tp.BILHETE_IDENTIDADE, '-')) LIKE :search
        )
      `
        : ``
      }
    ) q
  ) t
  WHERE t.RN BETWEEN :offset + 1 AND :offset + :limit
  ORDER BY t.RN
`;
    const countSql = `
  SELECT COUNT(*) AS TOTAL
  FROM (
    SELECT DISTINCT
      tm.CODIGO
    FROM FK2_TB_MATRICULAS tm
    INNER JOIN FK2_TB_ADMISSAO ta
      ON ta.CODIGO = tm.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO tp
      ON tp.CODIGO = ta.PRE_INCRICAO
    INNER JOIN FK2_TB_PROVINCIAS tpr
      ON tpr.CODIGO = tp.CODIGO_PROVINCIA_RESIDENCIA_PERMANENTE
    INNER JOIN FK2_TB_NACIONALIDADES tn
      ON tn.CODIGO = tp.CODIGO_NACIONALIDADE
    INNER JOIN FK2_TB_MUNICIPIOS tm2
      ON tm2.CODIGO = tp.CODIGO_MUNICIPIO
    INNER JOIN FK2_TB_CURSOS tc
      ON tc.CODIGO = tm.CODIGO_CURSO
     AND (tc.TIPO_CANDIDATURA = :grau OR :grau_zero = 0)
    INNER JOIN FK2_TB_FACULDADE tf
      ON tf.CODIGO = tc.FACULDADE_ID
    WHERE (
      (
        (
          SELECT COUNT(tpcg.CODIGO_GRADE_CURRICULAR)
          FROM FK2_TB_PLANO_CURRICULAR_GRADE tpcg
          INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc
            ON tpcg.CODIGO_PLANO_CURRICULAR_CURSO = tpcc.CODIGO
          WHERE tpcc.CODIGO_CURSO = tm.CODIGO_CURSO
            AND tpcc.CODIGO_ANO_LECTIVO = :anoLectivo
        ) +
        (
          SELECT COUNT(tpcg.CODIGO_GRADE_CURRICULAR)
          FROM FK2_TB_PLANO_CURRICULAR_GRADE tpcg
          INNER JOIN FK2_TB_PLANO_CURRICULAR_CURSO tpcc
            ON tpcg.CODIGO_PLANO_CURRICULAR_CURSO = tpcc.CODIGO
          INNER JOIN FK2_TB_PREINSCRICAO tp2
            ON ta.PRE_INCRICAO = tp2.CODIGO
          WHERE tpcc.CODIGO_CURSO = tp2.CURSO_CANDIDATURA
            AND tpcc.CODIGO_ANO_LECTIVO = :anoLectivo
            AND tp2.CURSO_CANDIDATURA != tm.CODIGO_CURSO
        )
      ) -
      (
        SELECT COUNT(tgca.CODIGO_GRADE_CURRICULAR)
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO tgca
        INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
          ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
        WHERE tgca.CODIGO_MATRICULA = tm.CODIGO
          AND tgca.CODIGO_STATUS_GRADE_CURRICULAR = 3
          AND tgc.STATUS_ NOT IN (0, 3)
          AND tm.CODIGO_CURSO = tgc.CODIGO_CURSO
      )
    ) = 1
    ${search && search.trim()
        ? `
      AND (
        UPPER(tp.NOME_COMPLETO) LIKE :search
        OR UPPER(NVL(tp.BILHETE_IDENTIDADE, '-')) LIKE :search
      )
    `
        : ``
      }
  )
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

    const total = Number(countResult?.[0]?.TOTAL ?? 0);

    const data = result.map((row: any, index: number) => ({
      numero: offset + index + 1,
      nome: row.NOME_COMPLETO,
      numero_bilhete: row.BILHETE_IDENTIDADE,
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
    const { page = 1, limit = 10, anoLectivo = 0, grau = 0, search } = filter;

    if (!anoLectivo || anoLectivo === 0) {
      throw new BadRequestException('O ano lectivo é obrigatório');
    }

    if (!grau || grau === 0) {
      throw new BadRequestException('O grau é obrigatório');
    }

    const offset = (page - 1) * limit;

    const baseParams: Record<string, any> = {
      anoLectivo,
      grau,
    };

    let innerSearchClause = '';
    if (search && search.trim()) {
      innerSearchClause = `
    AND (
      UPPER(tp.NOME_COMPLETO) LIKE :search
      OR UPPER(NVL(tp.BILHETE_IDENTIDADE, '-')) LIKE :search
    )
  `;
      baseParams.search = `%${search.trim().toUpperCase()}%`;
    }

    const sql = `
  SELECT *
  FROM (
    SELECT
      t.*,
      ROW_NUMBER() OVER (ORDER BY t.NOME_COMPLETO ASC) AS RN
    FROM (
      SELECT
        tp.NOME_COMPLETO,
        tp.BILHETE_IDENTIDADE,
        tp.SEXO,
        EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM tp.DATA_NASCIMENTO) AS IDADE,
        tp.DATA_NASCIMENTO,
        tpr.DESIGNACAO AS PROVINCIA_RESIDENCIA,
        tn.DESIGNACAO AS PAIS_ORIGEM,
        tm.DESIGNACAO AS MUNICIPIO,
        CASE
          WHEN tp.CODIGO_TURNO = 5 THEN 'Regular'
          ELSE 'Pós-Laboral'
        END AS PERIODO_ESTUDO,
        tc.DESIGNACAO AS CURSO,
        CASE
          WHEN NVL(ta.MEDIAFINAL, 0) > 0 THEN ta.MEDIAFINAL
          ELSE NVL((
            SELECT cp.NOTA
            FROM FK2_CANDIDATO_PROVAS cp
            INNER JOIN FK2_TB_HORARIO_PROVA thp
              ON thp.ID = cp.HORARIO_PROVA_ID
            WHERE cp.TEMPO IS NOT NULL
              AND cp.CANDIDATO_ID = tp.CODIGO
              AND thp.ANO_LECTIVO_ID = :anoLectivo
              AND ROWNUM = 1
          ), 0)
        END AS NOTA_EXAME_ACESSO,
        tp.INSTITUICAO_FORMACAO AS ESCOLA_ENSINO_MEDIO,
        CASE
          WHEN tp.CODIGO_OCUPACAO NOT IN (6, 7, 9) THEN 'Sim'
          ELSE 'Não'
        END AS TRABALHADOR,
        tf.DESIGNACAO AS UNIDADE_ORGANICA,
        ne.DESIGNACAO AS NECESSIDADE_ESPECIAL,
        tha.DESIGNACAO AS PROVENIENCIA,
        tp.CURSO_ENSINO_MEDIO,
        'SIM' AS ESTUDANTE_MATRICULADO_PRIMEIRA_VEZ,
        CASE
          WHEN (
            CASE
              WHEN NVL(ta.MEDIAFINAL, 0) > 0 THEN ta.MEDIAFINAL
              ELSE NVL((
                SELECT cp.NOTA
                FROM FK2_CANDIDATO_PROVAS cp
                INNER JOIN FK2_TB_HORARIO_PROVA thp
                  ON thp.ID = cp.HORARIO_PROVA_ID
                WHERE cp.TEMPO IS NOT NULL
                  AND cp.CANDIDATO_ID = tp.CODIGO
                  AND thp.ANO_LECTIVO_ID = :anoLectivo
                  AND ROWNUM = 1
              ), 0)
            END
          ) > 9.4 THEN 'SIM'
          ELSE 'NÃO'
        END AS ADMISSAO
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
      INNER JOIN FK2_NECESSIDADE_ESPECIAIS ne
        ON ne.ID = tp.NECESSIDADE_ESPECIAL_ID
      INNER JOIN FK2_TB_HABILITACAO_ANTERIOR tha
        ON tha.CODIGO = tp.CODIGO_HABILITACAO_ANTERIOR
      WHERE tp.ANOLECTIVO = :anoLectivo
  AND tp.CODIGO_TIPO_CANDIDATURA = :grau
  ${innerSearchClause}
    ) t

  ) pag
  WHERE pag.RN BETWEEN :offset + 1 AND :offset + :limit
  ORDER BY pag.RN
`;

    const countSql = `
    SELECT COUNT(*) AS TOTAL
    FROM (
      SELECT
        tp.CODIGO
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
      INNER JOIN FK2_NECESSIDADE_ESPECIAIS ne
        ON ne.ID = tp.NECESSIDADE_ESPECIAL_ID
      INNER JOIN FK2_TB_HABILITACAO_ANTERIOR tha
        ON tha.CODIGO = tp.CODIGO_HABILITACAO_ANTERIOR
      WHERE tp.ANOLECTIVO = :anoLectivo
  AND tp.CODIGO_TIPO_CANDIDATURA = :grau
  ${innerSearchClause}
    ) t
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

    const total = Number(countResult?.[0]?.TOTAL ?? 0);

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
      estado = 2, // 1 = novos | 0 = antigos | 2 = todos
      search,
    } = filter;

    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Number(limit) : 10;
    const offset = (safePage - 1) * safeLimit;

    const anoLectivoNum = Number(anoLectivo) || 0;
    const grauNum = Number(grau) || 0;
    const anoCurricularNum = Number(anoCurricular) || 0;
    const estadoNum = Number(estado);

    if (!anoLectivoNum || anoLectivoNum === 0) {
      throw new BadRequestException('O ano lectivo é obrigatório');
    }

    const searchValue =
      search && String(search).trim()
        ? `%${String(search).trim().toUpperCase()}%`
        : null;

    let estadoClause = '';

    if (estadoNum === 1) {
      // estudantes novos
      estadoClause = `
      AND tp.ANOLECTIVO = :5
    `;
    } else if (estadoNum === 0) {
      // estudantes antigos
      estadoClause = `
      AND tp.ANOLECTIVO != :5
    `;
    } else {
      // todos
      estadoClause = '';
    }

    const sql = `
    WITH base_estudantes AS (
      SELECT DISTINCT
        tp.NOME_COMPLETO AS NOME_COMPLETO,
        tp.BILHETE_IDENTIDADE AS BILHETE_IDENTIDADE,
        tp.SEXO AS SEXO,
        FLOOR(MONTHS_BETWEEN(SYSDATE, tp.DATA_NASCIMENTO) / 12) AS IDADE,
        tp.DATA_NASCIMENTO AS DATA_NASCIMENTO,
        tpr.DESIGNACAO AS PROVINCIA,
        tm2.DESIGNACAO AS MUNICIPIO,
        tn.DESIGNACAO AS PAIS,
        CASE
          WHEN tp.CODIGO_TURNO = 5 THEN 'Regular'
          ELSE 'Pós-Laboral'
        END AS PERIODO_ESTUDO,
        tf.DESIGNACAO AS FACULDADE,
        tc.DESIGNACAO AS CURSO,
        (
          SELECT MAX(tc3.CLASSE)
          FROM FK2_TB_CONFIRMACOES tc3
          WHERE tc3.CODIGO_MATRICULA = tm.CODIGO
            AND (tc3.CLASSE = :1 OR :2 = 0)
        ) AS CLASSE,
        tm.ESTADO_MATRICULA AS ESTADO_MATRICULA,
        tm.CODIGO AS CODIGO_MATRICULA
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO g
      INNER JOIN FK2_TB_MATRICULAS tm
        ON g.CODIGO_MATRICULA = tm.CODIGO
      INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON ta.PRE_INCRICAO = tp.CODIGO
      INNER JOIN FK2_TB_FACULDADE tf
        ON tf.CODIGO = tc.FACULDADE_ID
      LEFT JOIN FK2_TB_PROVINCIAS tpr
        ON tpr.CODIGO = tp.CODIGO_PROVINCIA_RESIDENCIA_PERMANENTE
      LEFT JOIN FK2_TB_NACIONALIDADES tn
        ON tn.CODIGO = tp.CODIGO_NACIONALIDADE
      LEFT JOIN FK2_TB_MUNICIPIOS tm2
        ON tm2.CODIGO = tp.CODIGO_MUNICIPIO
      LEFT JOIN FK2_TB_CONFIRMACOES tcf
        ON tcf.CODIGO_MATRICULA = tm.CODIGO
      WHERE g.CODIGO_STATUS_GRADE_CURRICULAR IN (2)
        AND g.CODIGO_ANO_LECTIVO = :3
        AND (tc.TIPO_CANDIDATURA = :4 OR :4 = 0)
        ${estadoClause}
    ),

    taxa_aproveitamento AS (
      SELECT
        g.CODIGO_MATRICULA,
        COUNT(*) AS TOTAL_DISCIPLINAS,
        SUM(CASE WHEN g.CODIGO_STATUS_GRADE_CURRICULAR = 3 THEN 1 ELSE 0 END) AS TOTAL_APROVADAS
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO g
      WHERE g.CODIGO_ANO_LECTIVO = :6
      GROUP BY g.CODIGO_MATRICULA
    ),

    final_data AS (
      SELECT
        b.*,
        CASE
          WHEN NVL(t.TOTAL_DISCIPLINAS, 0) = 0 THEN 0
          ELSE ROUND((NVL(t.TOTAL_APROVADAS, 0) * 100) / t.TOTAL_DISCIPLINAS, 2)
        END AS TAXA_APROVEITAMENTO
      FROM base_estudantes b
      LEFT JOIN taxa_aproveitamento t
        ON t.CODIGO_MATRICULA = b.CODIGO_MATRICULA
      WHERE (
        :7 IS NULL
        OR UPPER(b.NOME_COMPLETO) LIKE :8
        OR UPPER(NVL(b.BILHETE_IDENTIDADE, '-')) LIKE :9
        OR UPPER(NVL(b.CURSO, '-')) LIKE :10
        OR UPPER(NVL(b.FACULDADE, '-')) LIKE :11
      )
    )

    SELECT *
    FROM (
      SELECT
        f.*,
        ROW_NUMBER() OVER (ORDER BY f.NOME_COMPLETO ASC) AS RN
      FROM final_data f
    ) t
    WHERE t.RN BETWEEN :12 AND :13
    ORDER BY t.RN
  `;

    let sqlParams: any[] = [];

    if (estadoNum === 1 || estadoNum === 0) {
      sqlParams = [
        anoCurricularNum, // :1
        anoCurricularNum, // :2
        anoLectivoNum, // :3
        grauNum, // :4
        grauNum, // :4 repetido
        anoLectivoNum, // :5
        anoLectivoNum, // :6
        searchValue, // :7
        searchValue, // :8
        searchValue, // :9
        searchValue, // :10
        searchValue, // :11
        offset + 1, // :12
        offset + safeLimit, // :13
      ];
    } else {
      // estado = 2 (todos)
      sqlParams = [
        anoCurricularNum, // :1
        anoCurricularNum, // :2
        anoLectivoNum, // :3
        grauNum, // :4
        grauNum, // :4 repetido
        anoLectivoNum, // :6
        searchValue, // :7
        searchValue, // :8
        searchValue, // :9
        searchValue, // :10
        searchValue, // :11
        offset + 1, // :12
        offset + safeLimit, // :13
      ];
    }

    const countSql = `
    WITH base_estudantes AS (
      SELECT DISTINCT
        tp.NOME_COMPLETO AS NOME_COMPLETO,
        tp.BILHETE_IDENTIDADE AS BILHETE_IDENTIDADE,
        tf.DESIGNACAO AS FACULDADE,
        tc.DESIGNACAO AS CURSO,
        tm.CODIGO AS CODIGO_MATRICULA
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO g
      INNER JOIN FK2_TB_MATRICULAS tm
        ON g.CODIGO_MATRICULA = tm.CODIGO
      INNER JOIN FK2_TB_CURSOS tc
        ON tc.CODIGO = tm.CODIGO_CURSO
      INNER JOIN FK2_TB_ADMISSAO ta
        ON ta.CODIGO = tm.CODIGO_ALUNO
      INNER JOIN FK2_TB_PREINSCRICAO tp
        ON ta.PRE_INCRICAO = tp.CODIGO
      INNER JOIN FK2_TB_FACULDADE tf
        ON tf.CODIGO = tc.FACULDADE_ID
      LEFT JOIN FK2_TB_CONFIRMACOES tcf
        ON tcf.CODIGO_MATRICULA = tm.CODIGO
      WHERE g.CODIGO_STATUS_GRADE_CURRICULAR IN (2)
        AND g.CODIGO_ANO_LECTIVO = :1
        AND (tc.TIPO_CANDIDATURA = :2 OR :2 = 0)
        ${estadoClause}
    )
    SELECT COUNT(*) AS TOTAL
    FROM base_estudantes b
    WHERE (
      :6 IS NULL
      OR UPPER(b.NOME_COMPLETO) LIKE :7
      OR UPPER(NVL(b.BILHETE_IDENTIDADE, '-')) LIKE :8
      OR UPPER(NVL(b.CURSO, '-')) LIKE :9
      OR UPPER(NVL(b.FACULDADE, '-')) LIKE :10
    )
  `;

    let countSqlFinal = countSql;
    let countParams: any[] = [];

    if (estadoNum === 1 || estadoNum === 0) {
      countParams = [
        anoLectivoNum, // :1
        grauNum, // :2
        grauNum, // :2 repetido
        anoLectivoNum, // :5
        searchValue, // :6
        searchValue, // :7
        searchValue, // :8
        searchValue, // :9
        searchValue, // :10
      ];
    } else {
      countSqlFinal = `
      WITH base_estudantes AS (
        SELECT DISTINCT
          tp.NOME_COMPLETO AS NOME_COMPLETO,
          tp.BILHETE_IDENTIDADE AS BILHETE_IDENTIDADE,
          tf.DESIGNACAO AS FACULDADE,
          tc.DESIGNACAO AS CURSO,
          tm.CODIGO AS CODIGO_MATRICULA
        FROM FK2_TB_GRADE_CURRICULAR_ALUNO g
        INNER JOIN FK2_TB_MATRICULAS tm
          ON g.CODIGO_MATRICULA = tm.CODIGO
        INNER JOIN FK2_TB_CURSOS tc
          ON tc.CODIGO = tm.CODIGO_CURSO
        INNER JOIN FK2_TB_ADMISSAO ta
          ON ta.CODIGO = tm.CODIGO_ALUNO
        INNER JOIN FK2_TB_PREINSCRICAO tp
          ON ta.PRE_INCRICAO = tp.CODIGO
        INNER JOIN FK2_TB_FACULDADE tf
          ON tf.CODIGO = tc.FACULDADE_ID
        LEFT JOIN FK2_TB_CONFIRMACOES tcf
          ON tcf.CODIGO_MATRICULA = tm.CODIGO
        WHERE g.CODIGO_STATUS_GRADE_CURRICULAR IN (2)
          AND g.CODIGO_ANO_LECTIVO = :1
          AND (tc.TIPO_CANDIDATURA = :2 OR :2 = 0)
      )
      SELECT COUNT(*) AS TOTAL
      FROM base_estudantes b
      WHERE (
        :3 IS NULL
        OR UPPER(b.NOME_COMPLETO) LIKE :4
        OR UPPER(NVL(b.BILHETE_IDENTIDADE, '-')) LIKE :5
        OR UPPER(NVL(b.CURSO, '-')) LIKE :6
        OR UPPER(NVL(b.FACULDADE, '-')) LIKE :7
      )
    `;

      countParams = [
        anoLectivoNum, // :1
        grauNum, // :2
        grauNum, // :2 repetido
        searchValue, // :3
        searchValue, // :4
        searchValue, // :5
        searchValue, // :6
        searchValue, // :7
      ];
    }

    const [result, countResult] = await Promise.all([
      this.dataSource.query(sql, sqlParams),
      this.dataSource.query(countSqlFinal, countParams),
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
      ano_frequencia: row.CLASSE,
      situacao_academica: row.ESTADO_MATRICULA,
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
      throw new BadRequestException(
        'Código da matrícula e ano letivo são obrigatórios',
      );
    }

    try {
      const sqlVerificarDiplomado = `
      SELECT
        M."ESTADO_MATRICULA"
      FROM FK2_TB_MATRICULAS M
      WHERE M."CODIGO" = :codigoMatricula
    `;

      const matriculaAtual = await this.dataSource.query(
        sqlVerificarDiplomado,
        {
          codigoMatricula,
        } as any,
      );

      if (matriculaAtual.length === 0) {
        throw new NotFoundException('Matrícula não encontrada');
      }

      const status = matriculaAtual[0];

      // Se já estiver diplomado, não permite ativar novamente
      if (
        status.ESTADO_MATRICULA === 'Diplomado' ||
        status.ESTADO_MATRICULA === 'diplomado' ||
        status.ESTADO_MATRICULA === 'concluido'
      ) {
        throw new BadRequestException(
          'Não é possível ativar esta matrícula. O aluno já está diplomado.',
        );
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
        const ref_utilizado = {
          pk: usuarioLogado?.sub,
          desc: usuarioLogado?.name,
          corLetra: 'black',
          disponivel: false,
        };

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

        await this.dataSource.query(sqlDesativarItems, {
          codigoMatricula,
          anoLectivoId,
        } as any);

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

        await this.dataSource.query(sqlDesativarFacturas, {
          codigoMatricula,
          anoLectivoId,
        } as any);
      }

      // ====================== 4. ATIVAR A MATRÍCULA ======================
      const sqlAtivarMatricula = `
      UPDATE FK2_TB_MATRICULAS M
      SET M."ESTADO_MATRICULA" = 'activo',
          M."UPDATED_AT" = SYSDATE
      WHERE M."CODIGO" = :codigoMatricula
    `;

      const resultMatricula = await this.dataSource.query(sqlAtivarMatricula, {
        codigoMatricula,
      } as any);

      if (resultMatricula[1] === 0) {
        throw new NotFoundException('Matrícula não encontrada');
      }

      // ====================== RESPOSTA ======================
      return {
        sucesso: true,
        mensagem: 'Matrícula ativada com sucesso',
        isencoesDePropinaDesativadas: isencoesDesativadas,
        detalhes:
          isencoesPropina.length > 0
            ? `${isencoesDesativadas} isenção(ões) de propina foram desativadas e as faturas relacionadas foram anuladas.`
            : 'Nenhuma isenção de propina ativa foi encontrada.',
      };
    } catch (error) {
      console.error('Erro ao ativar matrícula:', error);
      throw new BadRequestException(error || 'Erro ao ativar matrícula');
    }
  }

  async academicHistory(dto: AcademicHistoryDTO) {
    const {
      anoLectivoId,
      matriculaId,
      tipoProvaId,
      tipoAvaliacaoId,
      classeId,
      search,
      page = 1,
      limit = 10,
    } = dto;

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

  async updateHorarioGradeCurricular({
    codigoGradeCurricularAluno,
    horarioID,
  }: {
    codigoGradeCurricularAluno: number;
    horarioID: number;
  }) {
    const gradeCurricularID = codigoGradeCurricularAluno;
    const STATUS_PERMITIDO = 2;
    console.log({ codigoGradeCurricularAluno, horarioID });

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

    console.log({ gradeCurricular });

    if (gradeCurricular.codigo_status_grade_curricular !== STATUS_PERMITIDO) {
      throw new BadRequestException(
        `Apenas grades curriculares com estado ${statusGradeCurricular?.status_nome} podem ter horário`,
      );
    }

    const REF_HORARIO = JSON.stringify({
      pk: horario.pk,
      desc: horario.designacao,
    });

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

  async deleteGrade({
    codigoGradeCurricularAluno,
  }: {
    codigoGradeCurricularAluno: number;
  }) {
    console.log({ codigoGradeCurricularAluno });
    const gradeCurricularResult = await this.dataSource.query(
      `
    SELECT
      al.CODIGO_STATUS_GRADE_CURRICULAR as codigo_status_grade_curricular
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
    WHERE al.CODIGO = :1
    `,
      [codigoGradeCurricularAluno],
    );
    console.log({ gradeCurricularResult });
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

  async restoreGrade({
    codigoGradeCurricularAluno,
  }: {
    codigoGradeCurricularAluno: number;
  }) {
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
      throw new BadRequestException(
        'Não é possível definir especialidade para aluno diplomado',
      );
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
    let mudarCurso = true;
    let buscarHorario = true;
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
    if (
      confirmationExists ||
      matriculaDetails.estado.toLowerCase() === 'activo'
    ) {
      return {
        message: 'Funcionalidade de mudança de curso ainda não implementada',
        matriculaDetails,
        confirmationExists,
      };
    } else {
      return {
        message:
          'Matrícula não ativa e sem confirmação para o ano letivo atual. A troca de curso não pode ser realizada.',
        matriculaDetails,
        confirmationExists,
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
  async obterNotasCertificado(dto: GerarCertificadoDto) {
    const { matriculaId, anoMin, anoMax } = dto;

    const min = Math.min(anoMin, anoMax);
    const max = Math.max(anoMin, anoMax);

    const sql = `
      SELECT
          g.codigo,
          TRIM(d.designacao) AS disciplina,
          al.nota,
          g.HORASTEORICAS as horas_teoricas,
          g.HORASTEORICOSPRATICAS as horas_teorico_praticas,
          g.HORASPRATICAS as horas_praticas,
          dur.DESIGNACAO AS duracao_nome,
          an.DESIGNACAO AS ano_lectivo_nome,
          g.CODIGO_SEMESTRE as semestre,
          g.CODIGO_CLASSE AS classe
      FROM FK2_TB_GRADE_CURRICULAR_ALUNO al
      INNER JOIN FK2_TB_GRADE_CURRICULAR g  ON g.codigo = al.CODIGO_GRADE_CURRICULAR
      INNER JOIN FK2_TB_DISCIPLINAS d       ON d.codigo = g.CODIGO_DISCIPLINA
      INNER JOIN FK2_TB_DURACAO dur         ON dur.CODIGO = d.DURACAO
      INNER JOIN FK2_TB_ANO_LECTIVO an      ON an.CODIGO = al.CODIGO_ANO_LECTIVO
      WHERE al.CODIGO_STATUS_GRADE_CURRICULAR = 3
        AND al.NOTA >= 10
        AND al.CODIGO_MATRICULA = :matriculaId
        AND g.CODIGO_CLASSE BETWEEN :min AND :max
      ORDER BY
          g.CODIGO_CLASSE ASC,
          g.CODIGO_SEMESTRE ASC,
          NLSSORT(TRIM(d.designacao), 'NLS_SORT=BINARY_AI') ASC
    `;

    const result = await this.dataSource.query(sql, [matriculaId, min, max]);
    return toLowerCaseKeys(result);
  }

  async diplomarAluno(
    body: {
      codigoMatricula: number;
      dataConclusao?: Date | string;
      imprimeCartaConclusao?: boolean;
    },
    usuarioLogado: any,
  ) {
    const {
      codigoMatricula,
      dataConclusao,
      imprimeCartaConclusao = false,
    } = body;

    if (!codigoMatricula) {
      throw new BadRequestException('Código da matrícula é obrigatório');
    }

    const anoLectivoAtual = await this.anoLectivoUtil.getAnoAtualId();

    if (!anoLectivoAtual) {
      throw new BadRequestException('Ano lectivo actual não encontrado');
    }

    const dataConclusaoFinal = dataConclusao
      ? new Date(dataConclusao)
      : new Date();

    if (Number.isNaN(dataConclusaoFinal.getTime())) {
      throw new BadRequestException('Data de conclusão inválida');
    }

    return this.dataSource.transaction(async (manager) => {
      const matriculaResult = await manager.query(
        `
      SELECT
        M.CODIGO,
        M.ESTADO_MATRICULA,
        M.CODIGO_CURSO
      FROM FK2_TB_MATRICULAS M
      WHERE M.CODIGO = :codigoMatricula
      `,
        { codigoMatricula } as any,
      );

      if (!matriculaResult?.length) {
        throw new NotFoundException('Matrícula não encontrada');
      }

      const matricula = matriculaResult[0];
      const estadoMatricula = String(
        matricula.ESTADO_MATRICULA || '',
      ).toLowerCase();

      if (estadoMatricula === 'diplomado') {
        throw new BadRequestException('O estudante já está diplomado');
      }

      // Verifica se o estudante reúne condições para diplomar
      // const elegibilidadeResult = await manager.query(
      //   `
      // SELECT
      //   NVL((
      //     SELECT COUNT(DISTINCT
      //       GC.CODIGO_DISCIPLINA || '-' ||
      //       GC.CODIGO_CLASSE || '-' ||
      //       GC.CODIGO_SEMESTRE
      //     )
      //     FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
      //     INNER JOIN FK2_TB_GRADE_CURRICULAR GC
      //       ON GC.CODIGO = GCA.CODIGO_GRADE_CURRICULAR
      //     WHERE GCA.CODIGO_MATRICULA = :codigoMatricula
      //       AND GCA.CODIGO_STATUS_GRADE_CURRICULAR = 3
      //       AND GC.CODIGO_CURSO = :codigoCurso
      //   ), 0) AS TOTAL_FEITAS,
      //   NVL((
      //     SELECT COUNT(DISTINCT
      //       GC.CODIGO_DISCIPLINA || '-' ||
      //       GC.CODIGO_CLASSE || '-' ||
      //       GC.CODIGO_SEMESTRE
      //     )
      //     FROM FK2_TB_GRADE_CURRICULAR GC
      //     WHERE GC.CODIGO_CURSO = :codigoCurso
      //       AND GC.STATUS_ = 1
      //   ), 0) AS TOTAL_CURSO
      // FROM DUAL
      // `,
      //   {
      //     codigoMatricula,
      //     codigoCurso: matricula.CODIGO_CURSO,
      //   } as any,
      // );
      const grades = await this.planStudent.findPlan(codigoMatricula);
      const totalFeitas = grades.totalGrasesAluno;
      const totalCurso = grades.totalGradesCurso;

      if (!totalCurso || totalFeitas < totalCurso) {
        throw new BadRequestException(
          'O estudante não se encontra em condições para ser diplomado',
        );
      }

      // Média final
      // const notaResult = await manager.query(
      //   `
      // SELECT
      //   NVL(ROUND(AVG(GCA.NOTA), 0), 0) AS NOTA_FINAL
      // FROM FK2_TB_GRADE_CURRICULAR_ALUNO GCA
      // INNER JOIN FK2_TB_GRADE_CURRICULAR GC
      //   ON GC.CODIGO = GCA.CODIGO_GRADE_CURRICULAR
      // WHERE GCA.CODIGO_MATRICULA = :codigoMatricula
      //   AND GCA.CODIGO_STATUS_GRADE_CURRICULAR = 3
      //   AND GC.CODIGO_CURSO = :codigoCurso
      // `,
      //   {
      //     codigoMatricula,
      //     codigoCurso: matricula.CODIGO_CURSO,
      //   } as any,
      // );
      // const m = grades.grades.map(t => t.nota)
      // const notaFinal = Number(notaResult?.[0]?.NOTA_FINAL ?? 0);

      const somaNotas = grades.grades.reduce(
        (total, item) => total + item.nota,
        0,
      );
      const quantidadeNotas = grades.grades.length;
      const notaFinal =
        quantidadeNotas > 0 ? Math.round(somaNotas / quantidadeNotas) : 0;

      // Atualiza estado da matrícula
      await manager.query(
        `
      UPDATE FK2_TB_MATRICULAS
      SET ESTADO_MATRICULA = 'diplomado',
          UPDATED_AT = SYSDATE
      WHERE CODIGO = :codigoMatricula
      `,
        { codigoMatricula } as any,
      );

      const refUtilizador =
        usuarioLogado?.sub || usuarioLogado?.name
          ? JSON.stringify({
            pk: usuarioLogado?.sub ?? null,
            desc: usuarioLogado?.name ?? null,
          })
          : null;

      // Verifica se já existe conclusão para esta matrícula
      const conclusaoExistente = await manager.query(
        `
      SELECT CODIGO
      FROM FK2_CONCLUSAO_CURSO_ALUNO
      WHERE CODIGO_MATRICULA = :codigoMatricula
      `,
        { codigoMatricula } as any,
      );

      if (conclusaoExistente?.length) {
        await manager.query(
          `
        UPDATE FK2_CONCLUSAO_CURSO_ALUNO
        SET DATA_CONCLUSAO = :dataConclusao,
            NOTA = :notaFinal,
            ANO_LECTIVO = :anoLectivo,
            URLDIPLOMA = '-',
            REF_UTILIZADOR = :refUtilizador
        WHERE CODIGO_MATRICULA = :codigoMatricula
        `,
          {
            codigoMatricula,
            dataConclusao: dataConclusaoFinal,
            notaFinal,
            anoLectivo: anoLectivoAtual,
            refUtilizador,
          } as any,
        );
      } else {
        await manager.query(
          `
        INSERT INTO FK2_CONCLUSAO_CURSO_ALUNO (
          CODIGO_MATRICULA,
          DATA_CONCLUSAO,
          NOTA,
          URLDIPLOMA,
          ANO_LECTIVO,
          REF_UTILIZADOR
        ) VALUES (
          :codigoMatricula,
          :dataConclusao,
          :notaFinal,
          '-',
          :anoLectivo,
          :refUtilizador
        )
        `,
          {
            codigoMatricula,
            dataConclusao: dataConclusaoFinal,
            notaFinal,
            anoLectivo: anoLectivoAtual,
            refUtilizador,
          } as any,
        );
      }

      // Opcional: cria declaração de fim de curso
      if (imprimeCartaConclusao) {
        const ultimoDocumentoResult = await manager.query(`
        SELECT NVL(MAX(CODIGO), 0) AS ULTIMO_CODIGO
        FROM FK2_TB_DOCUMENTOS_UC
      `);

        const proximoCodigoBase =
          Number(ultimoDocumentoResult?.[0]?.ULTIMO_CODIGO ?? 0) + 1;

        const codigoDocumento = await gerarHashExterno(
          String(proximoCodigoBase),
        );

        await manager.query(
          `
        INSERT INTO FK2_TB_DOCUMENTOS_UC (
          DOCUMENTO,
          ANO_LETIVO,
          UTILIZADOR,
          DATAREGISTO,
          STATUS_,
          CODIGO_DOCUMENTO,
          CODIGO_MATRICULA,
          TIPO_DOCUMENTO,
          REF_UTILIZADOR
        ) VALUES (
          'Declaracão de Fim de Curso',
          :anoLectivo,
          :utilizador,
          SYSDATE,
          'Ativo',
          :codigoDocumento,
          :codigoMatricula,
          8,
          :refUtilizador
        )
        `,
          {
            anoLectivo: anoLectivoAtual,
            utilizador: usuarioLogado?.sub ?? null,
            codigoDocumento,
            codigoMatricula,
            refUtilizador,
          } as any,
        );
      }

      // Log
      await manager.query(
        `
      INSERT INTO FK2_MGA_TB_LOG_DIPLOMAR (
        DESCRICAO,
        FK_MATRICULA,
        FK_UTILIZADOR_RESPONSAVEL,
        CREATED_AT
      ) VALUES (
        'Diplomado',
        :codigoMatricula,
        :utilizadorResponsavel,
        SYSDATE
      )
      `,
        {
          codigoMatricula,
          utilizadorResponsavel: usuarioLogado?.sub ?? null,
        } as any,
      );

      return {
        success: true,
        message: 'Estudante diplomado com sucesso',
        data: {
          codigoMatricula,
          estadoMatricula: 'diplomado',
          notaFinal,
          anoLectivo: anoLectivoAtual,
          dataConclusao: dataConclusaoFinal,
          cartaConclusaoGerada: imprimeCartaConclusao,
        },
      };
    });
  }

  async desdiplomarAluno(
    body: {
      codigoMatricula: number;
      motivo?: string;
    },
    usuarioLogado: any,
  ) {
    const { codigoMatricula, motivo } = body;

    if (!codigoMatricula) {
      throw new BadRequestException('Código da matrícula é obrigatório');
    }

    return this.dataSource.transaction(async (manager) => {
      const matriculaResult = await manager.query(
        `
      SELECT
        M.CODIGO,
        M.ESTADO_MATRICULA
      FROM FK2_TB_MATRICULAS M
      WHERE M.CODIGO = :codigoMatricula
      FOR UPDATE
      `,
        { codigoMatricula } as any,
      );

      if (!matriculaResult?.length) {
        throw new NotFoundException('Matrícula não encontrada');
      }

      const matricula = matriculaResult[0];
      const estadoMatricula = String(
        matricula.ESTADO_MATRICULA || '',
      ).toLowerCase();

      if (estadoMatricula !== 'diplomado') {
        throw new BadRequestException('O estudante não está diplomado');
      }

      const conclusaoResult = await manager.query(
        `
      SELECT CODIGO
      FROM FK2_CONCLUSAO_CURSO_ALUNO
      WHERE CODIGO_MATRICULA = :codigoMatricula
      FOR UPDATE
      `,
        { codigoMatricula } as any,
      );

      if (!conclusaoResult?.length) {
        throw new BadRequestException(
          'Conclusão do curso não encontrada para esta matrícula',
        );
      }

      await manager.query(
        `
      DELETE FROM FK2_CONCLUSAO_CURSO_ALUNO
      WHERE CODIGO_MATRICULA = :codigoMatricula
      `,
        { codigoMatricula } as any,
      );

      await manager.query(
        `
      UPDATE FK2_TB_MATRICULAS
      SET ESTADO_MATRICULA = 'activo',
          UPDATED_AT = SYSDATE
      WHERE CODIGO = :codigoMatricula
      `,
        { codigoMatricula } as any,
      );

      const motivoLimpo = motivo?.trim();
      const descricao = motivoLimpo
        ? `Diploma anulado: ${motivoLimpo}`
        : 'Diploma anulado';

      await manager.query(
        `
      INSERT INTO FK2_MGA_TB_LOG_DIPLOMAR (
        DESCRICAO,
        FK_MATRICULA,
        FK_UTILIZADOR_RESPONSAVEL,
        CREATED_AT
      ) VALUES (
        :descricao,
        :codigoMatricula,
        :utilizadorResponsavel,
        SYSDATE
      )
      `,
        {
          descricao,
          codigoMatricula,
          utilizadorResponsavel: usuarioLogado?.sub ?? null,
        } as any,
      );

      return {
        success: true,
        message: 'Diploma do estudante anulado com sucesso',
        data: {
          codigoMatricula,
          estadoMatricula: 'activo',
          conclusaoCursoRemovida: true,
          descricaoLog: descricao,
        },
      };
    });
  }

  async gerarDiploma(body: {
    codigoMatricula: number;
    segundaViaDiploma?: boolean;
  }) {
    const { codigoMatricula, segundaViaDiploma = false } = body;

    if (!codigoMatricula) {
      throw new BadRequestException('Código da matrícula é obrigatório');
    }

    const result = await this.dataSource.query(
      `
    SELECT
      M.CODIGO AS CODIGO_MATRICULA,
      M.ESTADO_MATRICULA,
      CCA.DATA_CONCLUSAO,
      CCA.NOTA,
      CUR.DESIGNACAO AS CURSO,
      TC.ID AS TIPO_CANDIDATURA_ID,
      TC.DESIGNACAO AS TIPO_CANDIDATURA,
      PRE.NOME_COMPLETO,
      PRE.DATA_NASCIMENTO,
      PRE.NATURALIDADE,
      PRE.PAI,
      PRE.MAE,
      PRE.BILHETE_IDENTIDADE,
      PRE.SEXO,
      TID.DESCRICAO AS TIPO_DOCUMENTO_NOME
    FROM FK2_TB_MATRICULAS M
    INNER JOIN FK2_TB_ADMISSAO ADM
      ON ADM.CODIGO = M.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO PRE
      ON PRE.CODIGO = ADM.PRE_INCRICAO
    INNER JOIN FK2_TB_CURSOS CUR
      ON CUR.CODIGO = M.CODIGO_CURSO
    LEFT JOIN FK2_TB_TIPO_CANDIDATURA TC
      ON TC.ID = PRE.CODIGO_TIPO_CANDIDATURA
    LEFT JOIN FK2_TB_TIPO_IDENTIFICACAO TID
      ON TID.CODIGO = PRE.TIPO_IDENTIFICACAO
    LEFT JOIN FK2_CONCLUSAO_CURSO_ALUNO CCA
      ON CCA.CODIGO_MATRICULA = M.CODIGO
    WHERE M.CODIGO = :codigoMatricula
    `,
      { codigoMatricula } as any,
    );

    if (!result?.length) {
      throw new NotFoundException('Matrícula não encontrada');
    }

    const aluno = result[0];

    if (!aluno.DATA_CONCLUSAO) {
      throw new BadRequestException(
        'Faltam dados do aluno diplomado. Conclusão do curso não encontrada',
      );
    }

    if (String(aluno.ESTADO_MATRICULA || '').toLowerCase() !== 'diplomado') {
      throw new BadRequestException(
        'O estudante não está diplomado, não é possível gerar o diploma',
      );
    }

    const reitorResult = await this.dataSource.query(
      `
    SELECT DIRECTOR
    FROM FK2_TB_DADOS_INSTITUICAO
    WHERE DIRECTOR IS NOT NULL
    ORDER BY CODIGO DESC
    FETCH FIRST 1 ROWS ONLY
    `,
    );

    const reitor = reitorResult?.[0]?.DIRECTOR?.trim?.() || '';

    const cursoOriginal = String(aluno.CURSO || '');
    let cursoDiploma = cursoOriginal;
    let nivelAcademico = 'Licenciatura';

    if (cursoOriginal.includes('M - ')) {
      cursoDiploma = `Mestrado em${cursoOriginal.substring(3)}`;
      nivelAcademico = 'defesa de dissertação';
    } else if (cursoOriginal.includes('D - ')) {
      cursoDiploma = `Doutoramento ${cursoOriginal.substring(1)}`;
      nivelAcademico = 'defesa de dissertação';
    }

    return {
      success: true,
      message: 'Dados do diploma gerados com sucesso',
      data: {
        codigoMatricula: Number(aluno.CODIGO_MATRICULA),
        nomeAluno: aluno.NOME_COMPLETO,
        curso: cursoDiploma,
        dataNascimento: formatarDataExtenso(aluno.DATA_NASCIMENTO),
        dataConclusao: formatarDataExtenso(aluno.DATA_CONCLUSAO),
        dataEmissaoDocumento: formatarDataExtenso(new Date()),
        naturalidade: aluno.NATURALIDADE || '',
        nomePai: aluno.PAI || '',
        nomeMae: aluno.MAE || '',
        nivelAcademico,
        bilhete: aluno.BILHETE_IDENTIDADE || '',
        notaFinal: String(aluno.NOTA ?? ''),
        notaFinalExtenso: notaExtenso(Number(aluno.NOTA ?? 0)),
        genero: aluno.SEXO || '',
        nomeDocumento: aluno.TIPO_DOCUMENTO_NOME || '',
        reitor,
        viaDiploma: segundaViaDiploma ? '2ª via' : '',
        tipoCandidaturaId: aluno.TIPO_CANDIDATURA_ID ?? null,
        tipoCandidatura: aluno.TIPO_CANDIDATURA ?? '',
        template:
          Number(aluno.TIPO_CANDIDATURA_ID) === 1
            ? 'diploma_ortoga'
            : 'diploma_ortoga_mestrado',
      },
    };
  }

  async listarEstudantesDiplomados(filter: ListarDiplomadosDTO) {
    const {
      anoLectivo,
      codigoCurso = 0,
      genero = 'todos',
      tipoCandidatura = 0,
      page = 1,
      limit = 10,
      search,
    } = filter;

    const offset = (page - 1) * limit;

    const params: any = {
      anoLectivo,
      codigoCurso,
      genero,
      tipoCandidatura,
      offset,
      limit: offset + limit,
    };

    params.search = search?.trim() ? `%${search.trim().toUpperCase()}%` : null;

    const sql = `
    SELECT *
    FROM (
      SELECT
        dados.*,
        ROW_NUMBER() OVER (ORDER BY dados.NOME ASC) AS rn,
        COUNT(*) OVER () AS total_registros
      FROM (
        SELECT DISTINCT
          tm.CODIGO AS matricula,
          tp.NOME_COMPLETO AS nome,
          tp.BILHETE_IDENTIDADE AS bilhete,
          NVL(fn_tipo_estudante(fb.CODIGO, i.RENUNCIA, fb.CODIGO_TIPO_BOLSA), '-') AS tipo_aluno,
          tp.DATA_NASCIMENTO AS data_nascimento,
          tc.CODIGO AS codigo_curso,
          tc.DESIGNACAO AS curso,
          ttc.ID AS codigo_tipo_candidatura,
          ttc.DESIGNACAO AS tipo_candidatura,
          tm.DATA_MATRICULA AS data_matricula,
          cca.DATA_CONCLUSAO AS data_conclusao,
          tp.SEXO AS genero,
          EXTRACT(YEAR FROM SYSDATE) - EXTRACT(YEAR FROM tp.DATA_NASCIMENTO) AS idade,
          cca.NOTA AS media
        FROM FK2_CONCLUSAO_CURSO_ALUNO cca
        INNER JOIN FK2_TB_MATRICULAS tm
          ON tm.CODIGO = cca.CODIGO_MATRICULA
        INNER JOIN FK2_TB_CURSOS tc
          ON tc.CODIGO = tm.CODIGO_CURSO
        INNER JOIN FK2_TB_ADMISSAO ta
          ON ta.CODIGO = tm.CODIGO_ALUNO
        INNER JOIN FK2_TB_PREINSCRICAO tp
          ON tp.CODIGO = ta.PRE_INCRICAO
        INNER JOIN FK2_TB_TIPO_CANDIDATURA ttc
          ON ttc.ID = tp.CODIGO_TIPO_CANDIDATURA

        LEFT JOIN FK2_TB_BOLSEIROS fb
          ON fb.CODIGO_MATRICULA = tm.CODIGO
         AND fb.CODIGO_ANOLECTIVO = cca.ANO_LECTIVO
         AND fb.STATUS_ = 0

        LEFT JOIN FK2_TB_INSTITUICAO i
          ON i.CODIGO = fb.CODIGO_INSTITUICAO

        WHERE cca.ANO_LECTIVO = :anoLectivo
          AND (:codigoCurso = 0 OR tc.CODIGO = :codigoCurso)
          AND (:genero = 'todos' OR tp.SEXO = :genero)
          AND (:tipoCandidatura = 0 OR tp.CODIGO_TIPO_CANDIDATURA = :tipoCandidatura)
          AND (
            :search IS NULL
            OR UPPER(tp.NOME_COMPLETO) LIKE :search
            OR UPPER(tp.BILHETE_IDENTIDADE) LIKE :search
            OR UPPER(TO_CHAR(tm.CODIGO)) LIKE :search
            OR UPPER(tc.DESIGNACAO) LIKE :search
          )
      ) dados
    )
    WHERE rn > :offset
      AND rn <= :limit
    ORDER BY rn
  `;

    const result = await this.dataSource.query(sql, params as any);

    const total = result.length > 0 ? Number(result[0].TOTAL_REGISTROS) : 0;

    const data = result.map((row: any) => {
      const { RN, TOTAL_REGISTROS, ...item } = row;
      return item;
    });

    return {
      success: true,
      data: await toLowerCaseKeys(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
