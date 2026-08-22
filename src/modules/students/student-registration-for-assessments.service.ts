import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { Injectable } from '@nestjs/common';
import { FilterInscricaoAvaliacaoDto } from './dto/filter-inscricao-avaliacao.dto';

@Injectable()
export class StudentRegistrationForAssessmentService {
  constructor(private readonly dataSource: DataSource) {}

  async find(filter: FilterInscricaoAvaliacaoDto) {
    const {
      page = 1,
      limit = 25,
      codigoAnoLectivo,
      codigoMatricula,
      codigoCurso,
      codigoClasse,
      codigoSemestre,
      codigoDisciplina,
      tipoAvaliacao,
      estadoFactura,
      search,
      codigoHorario,
      codigoGrade,
    } = filter;

    const offset = (page - 1) * limit;
    const params: Record<string, any> = {
      offset,
      limit_plus_offset: offset + limit,
    };

    const countParams: Record<string, any> = {};

    const addParam = (key: string, value: any) => {
      params[key] = value;
      countParams[key] = value;
    };

    let whereClause = `WHERE 1 = 1`;

    // Ano lectivo
    if (codigoAnoLectivo != null) {
      whereClause += `
        AND AV.CODIGO_ANO_LECTIVO = :codigoAnoLectivo
      `;

      addParam('codigoAnoLectivo', codigoAnoLectivo);
    }

    if (codigoHorario != null) {
      whereClause += `
        AND JSON_vALUE(AL.REF_HORARIO, '$.pk') = :codigoHorario
      `;
      addParam('codigoHorario', codigoHorario);
    }
    // Matrícula
    if (codigoMatricula != null) {
      whereClause += `
        AND AV.CODIGO_MATRICULA = :codigoMatricula
      `;

      addParam('codigoMatricula', codigoMatricula);
    }

    // Curso
    if (codigoCurso != null) {
      whereClause += `
        AND G.CODIGO_CURSO = :codigoCurso
      `;

      addParam('codigoCurso', codigoCurso);
    }

    // Classe
    if (codigoClasse != null) {
      whereClause += `
        AND G.CODIGO_CLASSE = :codigoClasse
      `;

      addParam('codigoClasse', codigoClasse);
    }
    if (codigoGrade != null && codigoHorario == null) {
      whereClause += `
        AND G.CODIGO = :codigoGrade
      `;
      addParam('codigoGrade', codigoGrade);
    }

    // Semestre
    if (codigoSemestre != null) {
      whereClause += `
        AND G.CODIGO_SEMESTRE = :codigoSemestre
      `;

      addParam('codigoSemestre', codigoSemestre);
    }

    // Disciplina
    if (codigoDisciplina != null) {
      whereClause += `
        AND G.CODIGO_DISCIPLINA = :codigoDisciplina
      `;

      addParam('codigoDisciplina', codigoDisciplina);
    }

    // Tipo de avaliação
    if (tipoAvaliacao != null) {
      whereClause += `
        AND TAV.CODIGO = :tipoAvaliacao
      `;

      addParam('tipoAvaliacao', tipoAvaliacao);
    }

    // Estado da factura
    if (estadoFactura != null) {
      whereClause += `
        AND F.ESTADO = :estadoFactura
      `;

      addParam('estadoFactura', estadoFactura);
    }

    // Pesquisa
    if (search?.trim()) {
      const term = `%${search.trim().toUpperCase()}%`;

      whereClause += `
        AND (
          UPPER(NVL(P.NOME_COMPLETO, 'N/A')) LIKE :search
          OR UPPER(NVL(D.DESIGNACAO, 'N/A')) LIKE :search
          OR UPPER(NVL(TAV.DESIGNACAO, 'N/A')) LIKE :search
          OR TO_CHAR(M.CODIGO) LIKE :search
          OR TO_CHAR(AV.CODIGO) LIKE :search
          OR TO_CHAR(F.CODIGO) LIKE :search
        )
      `;

      addParam('search', term);
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM FK2_INSCRICAO_AVALIACOES AV

      LEFT JOIN FK2_FACTURA F
        ON F.CODIGO = AV.CODIGO_FACTURA

      LEFT JOIN FK2_TB_TIPO_AVALIACAO TAV
        ON TAV.CODIGO = AV.CODIGO_TIPO_AVALIACAO

      LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES GCAV
        ON GCAV.GRADE_CURRICULAR_ALUNO = AV.CODIGO_GRADE_ALUNO
        AND GCAV.TIPO_AVALIACAO = AV.CODIGO_TIPO_AVALIACAO

      LEFT JOIN FK2_TB_MATRICULAS M
        ON M.CODIGO = AV.CODIGO_MATRICULA

      LEFT JOIN FK2_TB_ADMISSAO AD
        ON AD.CODIGO = M.CODIGO_ALUNO

      LEFT JOIN FK2_TB_PREINSCRICAO P
        ON P.CODIGO = AD.PRE_INCRICAO

      LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO AL
        ON AL.CODIGO = AV.CODIGO_GRADE_ALUNO

      LEFT JOIN FK2_TB_GRADE_CURRICULAR G
        ON G.CODIGO = AL.CODIGO_GRADE_CURRICULAR

      LEFT JOIN FK2_TB_DISCIPLINAS D
        ON D.CODIGO = G.CODIGO_DISCIPLINA

       LEFT JOIN FK2_TB_CLASSES CC
          ON CC.CODIGO =  G.CODIGO_CLASSE
        LEFT JOIN FK2_TB_SEMESTRES SS
          ON SS.CODIGO = G.CODIGO_SEMESTRE
        LEFT JOIN FK2_TB_CURSOS CU
          ON CU.CODIGO = G.CODIGO_CURSO

      ${whereClause}
    `;

    const countResult = await this.dataSource.query(
      countSql,
      countParams as any,
    );

    const total = Number(countResult[0]?.TOTAL ?? 0);

    const dataSql = `
      SELECT *
      FROM (
        SELECT
          D.DESIGNACAO AS disciplina,
          D.CODIGO AS codigo_disciplina,

          AN.DESIGNACAO AS ano_lectivo,
          AN.CODIGO     AS codigo_ano_lectivo,

          TAV.DESIGNACAO AS avaliacao,
          TAV.CODIGO AS codigo_tipo_avaliacao,

          F.CODIGO AS codigo_factura,
          F.DATAFACTURA AS data_factura,
          F.ESTADO AS estado_factura,

          AV.CODIGO AS codigo_inscricao,
          GCAV.NOTA AS nota,

          M.CODIGO AS codigo_matricula,

          P.NOME_COMPLETO AS nome_completo,

          G.CODIGO AS codigo_grade,
          G.CODIGO_CURSO AS codigo_curso,
          G.CODIGO_CLASSE AS codigo_classe,
          G.CODIGO_SEMESTRE AS codigo_semestre,

          SS.DESIGNACAO     AS semestre,
          CU.DESIGNACAO     AS curso,
          CC.DESIGNACAO     AS classe,

          ROW_NUMBER() OVER (
            ORDER BY
              P.NOME_COMPLETO ASC,
              G.CODIGO_CLASSE ASC,
              G.CODIGO_SEMESTRE ASC,
              D.DESIGNACAO ASC
          ) AS rn

        FROM FK2_INSCRICAO_AVALIACOES AV

        LEFT JOIN FK2_FACTURA F
          ON F.CODIGO = AV.CODIGO_FACTURA

        LEFT JOIN FK2_TB_TIPO_AVALIACAO TAV
          ON TAV.CODIGO = AV.CODIGO_TIPO_AVALIACAO

        LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO_AVALIACOES GCAV
          ON GCAV.GRADE_CURRICULAR_ALUNO =
             AV.CODIGO_GRADE_ALUNO          
        AND GCAV.TIPO_AVALIACAO = AV.CODIGO_TIPO_AVALIACAO

        LEFT JOIN FK2_TB_MATRICULAS M
          ON M.CODIGO = AV.CODIGO_MATRICULA

        LEFT JOIN FK2_TB_ADMISSAO AD
          ON AD.CODIGO = M.CODIGO_ALUNO

        LEFT JOIN FK2_TB_PREINSCRICAO P
          ON P.CODIGO = AD.PRE_INCRICAO

        LEFT JOIN FK2_TB_GRADE_CURRICULAR_ALUNO AL
          ON AL.CODIGO = AV.CODIGO_GRADE_ALUNO

        LEFT JOIN FK2_TB_GRADE_CURRICULAR G
          ON G.CODIGO = AL.CODIGO_GRADE_CURRICULAR

        LEFT JOIN FK2_TB_ANO_LECTIVO AN
          ON AN.CODIGO = AL.CODIGO_ANO_LECTIVO

        LEFT JOIN FK2_TB_DISCIPLINAS D
          ON D.CODIGO = G.CODIGO_DISCIPLINA
        LEFT JOIN FK2_TB_CLASSES CC
          ON CC.CODIGO =  G.CODIGO_CLASSE
        LEFT JOIN FK2_TB_SEMESTRES SS
          ON SS.CODIGO = G.CODIGO_SEMESTRE
        LEFT JOIN FK2_TB_CURSOS CU
          ON CU.CODIGO = G.CODIGO_CURSO

        ${whereClause}
      ) t

      WHERE rn BETWEEN (:offset + 1)
                   AND :limit_plus_offset

      ORDER BY rn
    `;

    const result = await this.dataSource.query(dataSql, params as any);

    const data = result.map((row: any) => {
      const { RN, ...item } = row;
      return item;
    });

    return {
      data: await toLowerCaseKeys(data),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
