import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as oracledb from 'oracledb';
import { DataSource } from 'typeorm';
import { EnrollmentDto, GradeItemDto } from './dto/create-enrollment.dto';
import { FilterListagemGeralEstudantesDto } from './dto/filter-listagem-geral-de-estudantes.dto';

@Injectable()
export class EnrollmentService {
  private logger = new Logger(EnrollmentService.name);
  constructor(private readonly dataSource: DataSource) { }

  async enrollment(enrollmentDto: EnrollmentDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const { codPreInscricao, grades } = enrollmentDto;
    const { primeiroSemestre, segundoSemestre } =
      this.separarGradesPorSemestre(grades);

    try {
     
      const admissaoResult = await queryRunner.query(
        `SELECT "CODIGO" FROM FK2_TB_ADMISSAO WHERE "PRE_INCRICAO" = :codPreInscricao`,
        [codPreInscricao],
      );

      if (admissaoResult.length === 0) {
        throw new HttpException('Aluno Não Admitido', HttpStatus.NOT_FOUND);
      }

      const codAmissao = admissaoResult[0].CODIGO;

     
      const [matriculaExistente] = await queryRunner.query(
        `SELECT 1 FROM FK2_TB_MATRICULAS WHERE "CODIGO_ALUNO" = :codAmissao`,
        [codAmissao],
      );

      if (matriculaExistente) {
        throw new HttpException(
          'Aluno já possui matrícula',
          HttpStatus.BAD_REQUEST,
        );
      }

     
      const preResult = await queryRunner.query(
        `SELECT "USER_ID", "CURSO_CANDIDATURA", "CODIGO_TURNO" FROM FK2_TB_PREINSCRICAO WHERE "CODIGO" = :codPreInscricao`,
        [codPreInscricao],
      );

      if (preResult.length === 0) {
        throw new HttpException(
          'Nenhum dado de pré-inscrição encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      const {
        USER_ID: userId,
        CURSO_CANDIDATURA: codCurso,
        CODIGO_TURNO: codPeriodo,
      } = preResult[0];

    
      const [userResult] = await queryRunner.query(
        `SELECT "CANAL" FROM FK2_USERS WHERE "ID" = :userId`,
        [userId],
      );
      const canal = userResult?.CANAL ?? 0;

     
      const [maxMat] = await queryRunner.query(
        `SELECT NVL(MAX(TO_NUMBER("CODIGO")), 0) as maxCod FROM FK2_TB_MATRICULAS`,
      );
      const [maxAluno] = await queryRunner.query(
        `SELECT NVL(MAX(TO_NUMBER("NUMEROALUNO")), 0) as maxAluno FROM FK2_TB_MATRICULAS`,
      );

    
      const nAluno = Number(maxAluno.MAXALUNO) + 1;

   
   const matriculaResult=   await queryRunner.query(
        `INSERT INTO FK2_TB_MATRICULAS (
          "CODIGO_ALUNO", "DATA_MATRICULA", "CODIGO_CURSO",
          "CODIGOPAGAMENTO", "NUMEROALUNO", "ESTADO_MATRICULA", "CANAL", "UPDATED_AT"
        ) VALUES (
          :codAmissao, SYSDATE, :codCurso,
          0, :nAluno, 'inactivo', :canal, SYSDATE
        ) RETURNING CODIGO INTO :outId`,

        {codAmissao, codCurso, nAluno, canal, outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }} as any,
      );

      const codMatricula = matriculaResult.outId[0];

   
      const anoResult = await queryRunner.query(
        `SELECT "CODIGO" FROM FK2_TB_ANO_LECTIVO WHERE "ESTADO" = 'Activo' FETCH FIRST 1 ROWS ONLY`,
      );

      if (anoResult.length === 0) {
        throw new HttpException(
          'Nenhum ano lectivo activo encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      const codAnoActual = anoResult[0].CODIGO;

     
      const [maxConfResult] = await queryRunner.query(
        `SELECT NVL(MAX(TO_NUMBER("CODIGO")), 0) as maxConf FROM FK2_TB_CONFIRMACOES`,
      );
      let incrementadorConfirmacao = Number(maxConfResult.MAXCONF);

      const [maxGradeResult] = await queryRunner.query(
        `SELECT NVL(MAX(CODIGO), 0) as maxGrade FROM FK2_TB_GRADE_CURRICULAR_ALUNO`,
      );
      let incrementadorGrade = Number(maxGradeResult.MAXGRADE);

     
      const semestres = [
        { id: 1, disciplinas: primeiroSemestre },
        { id: 2, disciplinas: segundoSemestre },
      ];

      for (const item of semestres) {
        if (item.disciplinas.length === 0) continue;

        const sql = `
  INSERT INTO FK2_TB_CONFIRMACOES (
    CODIGO_MATRICULA,
    DATA_CONFIRMACAO,
    CODIGO_ANO_LECTIVO,
    ESTADO,
    CLASSE,
    CADEIRANTE,
    CANAL,
    SEMESTRE
  ) VALUES (
    :codMatricula,
    SYSDATE,
    :codAnoLectivo,
    0,
    1,
    'NAO',
    :canal,
    :semestre
  )
  RETURNING CODIGO INTO :outId
`;

        const binds = {
          codMatricula,
          codAnoLectivo: codAnoActual,
          canal,
          semestre: item.id,
          outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        };

        const result = await queryRunner.query(sql, binds as any);

        const codConfirmacaoAtual = result.outId[0];


        
        for (const codigoGrade of item.disciplinas) {
          incrementadorGrade++;

          const [exists] = await queryRunner.query(
            `SELECT 1 FROM FK2_TB_GRADE_CURRICULAR_ALUNO WHERE "CODIGO_GRADE_CURRICULAR" = :codigoGrade AND "CODIGO_MATRICULA" = :codMatricula`,
            [codigoGrade, codMatricula],
          );

          if (exists) {
            this.logger.warn(
              `Grade ${codigoGrade} já existe para matrícula ${codMatricula}`,
            );
            continue;
          }

         
          let refHorario = '';
          const horarioResult = await queryRunner.query(
            `SELECT "PK_HORARIO", "DESIGNACAO"
         FROM FK2_MGH_TB_HORARIO
         WHERE "ACTIVE_STATE" = '1'
           AND JSON_VALUE("REF_GRADE_CURRICULAR", '$.pk' RETURNING VARCHAR2) = :codigoGrade
           AND "FK_ANO_LECTIVO" = :codAnoActual
           AND "FK_PERIODO" = :codPeriodo
         FETCH FIRST 1 ROWS ONLY`,
            [codigoGrade, codAnoActual, codPeriodo],
          );

          if (horarioResult.length > 0) {
            const { PK_HORARIO, DESIGNACAO } = horarioResult[0];
            refHorario = JSON.stringify({ pk: PK_HORARIO, desc: DESIGNACAO });
          }

          const sql = `
  INSERT INTO FK2_TB_GRADE_CURRICULAR_ALUNO (
    CODIGO_GRADE_CURRICULAR,
    CODIGO_CONFIRMACAO,
    CODIGO_MATRICULA,
    ESTADO,
    NOTA,
    CREATED_AT,
    CANAL,
    CODIGO_STATUS_GRADE_CURRICULAR,
    CODIGO_ANO_LECTIVO,
    USER_ID,
    EPOCA,
    UPDATED_AT,
    EQUIVALENCIA,
    REF_HORARIO
  ) VALUES (
    :codigoGrade,
    :codConfirmacao,
    :codMatricula,
    0,
    0,
    SYSDATE,
    :canal,
    4,
    :codAnoLectivo,
    :userId,
    1,
    SYSDATE,
    0,
    :refHorario
  )
`;

          const binds = {
            codigoGrade,
            codConfirmacao: codConfirmacaoAtual,
            codMatricula,
            canal,
            codAnoLectivo: codAnoActual,
            userId,
            refHorario
          };

          await queryRunner.query(sql, binds as any);

        }
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Matrícula efetuada com sucesso',
        data: { codMatricula },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(error.message, error.stack);

      if (error instanceof HttpException) throw error;

      throw new HttpException(
        'Erro inesperado ao processar matrícula',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  private separarGradesPorSemestre(grades: GradeItemDto[]) {
    const resultado = grades.reduce(
      (acc, grade) => {
        const semestre = grade.semestre;
        const duracao = grade.duracaoDisciplina.toUpperCase();

        // Disciplina anual vai para os dois
        if (duracao === 'ANUAL') {
          acc.primeiroSemestre.push(grade.codigo);
          acc.segundoSemestre.push(grade.codigo);
          return acc;
        }

        if (semestre === 1) {
          acc.primeiroSemestre.push(grade.codigo);
        }

        if (semestre === 2) {
          acc.segundoSemestre.push(grade.codigo);
        }

        return acc;
      },
      {
        primeiroSemestre: [] as number[],
        segundoSemestre: [] as number[],
      },
    );

    return {
      primeiroSemestre: [...new Set(resultado.primeiroSemestre)],
      segundoSemestre: [...new Set(resultado.segundoSemestre)],
    };
  }

  async listarGeralEstudantes(filter: FilterListagemGeralEstudantesDto) {
  const {
    page = 1,
    limit = 10,
    anoLectivo = 0,
    faculdade = 0,
    grauAcademico = 0,
    curso = 0,
    anoCurricular = 0,
    periodo = 0,
    nacionalidade = 0,
    necessidade = 0,
    sexo = 0,
    search,
  } = filter;

  const offset = (page - 1) * limit;

  const baseParams: Record<string, any> = {
    anoLectivo,
    anoLectivo_zero: anoLectivo,
    faculdade,
    faculdade_zero: faculdade,
    grauAcademico,
    grauAcademico_zero: grauAcademico,
    curso,
    curso_zero: curso,
    anoCurricular,
    anoCurricular_zero: anoCurricular,
    periodo,
    periodo_zero: periodo,
    nacionalidade,
    nacionalidade_zero: nacionalidade,
    necessidade,
    necessidade_zero: necessidade,
    sexo,
    sexo_zero: sexo,
  };

  let whereClause = `
    WHERE (tal.CODIGO = :anoLectivo OR :anoLectivo_zero = 0)
      AND (tc2.FACULDADE_ID = :faculdade OR :faculdade_zero = 0)
      AND (tc2.GRAU = :grauAcademico OR :grauAcademico_zero = 0)
      AND (tc2.CODIGO = :curso OR :curso_zero = 0)
      AND (tgc.CODIGO_CLASSE = :anoCurricular OR :anoCurricular_zero = 0)
      AND (tp2.CODIGO = :periodo OR :periodo_zero = 0)
      AND (tn.CODIGO = :nacionalidade OR :nacionalidade_zero = 0)
      AND (NVL(ne.ID, 0) = :necessidade OR :necessidade_zero = 0)
      AND (
        :sexo_zero = 0
        OR tp.SEXO = (
          SELECT ts.DESIGNACAO
          FROM FK2_TB_SEXO ts
          WHERE ts.CODIGO = :sexo
        )
      )
  `;

  if (search && search.trim()) {
    whereClause += `
      AND (
        UPPER(tp.NOME_COMPLETO) LIKE :search
        OR UPPER(NVL(TO_CHAR(tm.NUMEROALUNO), TO_CHAR(tm.CODIGO_ALUNO))) LIKE :search
      )
    `;
    baseParams.search = `%${search.trim().toUpperCase()}%`;
  }

  const baseFrom = `
    FROM FK2_TB_MATRICULAS tm
    INNER JOIN FK2_TB_CONFIRMACOES tc
      ON tc.CODIGO_MATRICULA = tm.CODIGO
    INNER JOIN FK2_TB_CURSOS tc2
      ON tc2.CODIGO = tm.CODIGO_CURSO
    INNER JOIN FK2_TB_FACULDADE tf
      ON tf.CODIGO = tc2.FACULDADE_ID
    INNER JOIN FK2_TB_ADMISSAO ta
      ON ta.CODIGO = tm.CODIGO_ALUNO
    INNER JOIN FK2_TB_PREINSCRICAO tp
      ON tp.CODIGO = ta.PRE_INCRICAO
    INNER JOIN FK2_TB_NACIONALIDADES tn
      ON tn.CODIGO = tp.CODIGO_NACIONALIDADE
    INNER JOIN FK2_TB_ANO_LECTIVO tal
      ON tal.CODIGO = tc.CODIGO_ANO_LECTIVO
    LEFT JOIN FK2_NECESSIDADE_ESPECIAIS ne
      ON ne.ID = tp.NECESSIDADE_ESPECIAL_ID
    INNER JOIN FK2_TB_PERIODOS tp2
      ON tp.CODIGO_TURNO = tp2.CODIGO
    INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca
      ON tgca.CODIGO_MATRICULA = tm.CODIGO
    INNER JOIN FK2_TB_GRADE_CURRICULAR tgc
      ON tgc.CODIGO = tgca.CODIGO_GRADE_CURRICULAR
  `;

  const sql = `
    SELECT *
    FROM (
      SELECT
        q.*,
        ROW_NUMBER() OVER (ORDER BY q.NOME ASC) AS RN
      FROM (
        SELECT DISTINCT
          NVL(tm.NUMEROALUNO, tm.CODIGO_ALUNO) AS NUMERO_MATRICULA,
          tp.NOME_COMPLETO AS NOME,
          '-' AS TIPO_ALUNO,
          tal.DESIGNACAO AS ANO_LECTIVO,
          tp.SEXO AS SEXO,
          tn.DESIGNACAO AS NATURALIDADE,
          NVL(ne.DESIGNACAO, '-') AS NECESSIDADE,
          tf.DESIGNACAO AS FACULDADE,
          tc2.DESIGNACAO AS CURSO,
          tgc.CODIGO_CLASSE AS ANO_CURRICULAR,
          tp2.DESIGNACAO AS PERIODO
        ${baseFrom}
        ${whereClause}
      ) q
    ) t
    WHERE t.RN BETWEEN :offset + 1 AND :offset + :limit
    ORDER BY t.RN
  `;

  const countSql = `
    SELECT COUNT(*) AS TOTAL
    FROM (
      SELECT DISTINCT
        NVL(tm.NUMEROALUNO, tm.CODIGO_ALUNO) AS NUMERO_MATRICULA,
        tp.NOME_COMPLETO AS NOME,
        tal.DESIGNACAO AS ANO_LECTIVO,
        tp.SEXO AS SEXO,
        tn.DESIGNACAO AS NATURALIDADE,
        NVL(ne.DESIGNACAO, '-') AS NECESSIDADE,
        tf.DESIGNACAO AS FACULDADE,
        tc2.DESIGNACAO AS CURSO,
        tgc.CODIGO_CLASSE AS ANO_CURRICULAR,
        tp2.DESIGNACAO AS PERIODO
      ${baseFrom}
      ${whereClause}
    ) x
  `;

  const dataParams = {
    ...baseParams,
    offset,
    limit,
  };

  const countParams = {
    ...baseParams,
  };

  const [result, countResult] = await Promise.all([
    this.dataSource.query(sql, dataParams as any),
    this.dataSource.query(countSql, countParams as any),
  ]);

  const total = Number(countResult[0]?.TOTAL ?? 0);

  const data = result.map((row: any, index: number) => ({
    numero: offset + index + 1,
    numero_matricula: row.NUMERO_MATRICULA,
    nome: row.NOME,
    tipo_aluno: row.TIPO_ALUNO,
    ano_lectivo: row.ANO_LECTIVO,
    sexo: row.SEXO,
    naturalidade: row.NATURALIDADE,
    necessidade: row.NECESSIDADE,
    faculdade: row.FACULDADE,
    curso: row.CURSO,
    ano_curricular: row.ANO_CURRICULAR,
    periodo: row.PERIODO,
  }));

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

}
