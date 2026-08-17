import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as oracledb from 'oracledb';
import { DataSource, QueryRunner } from 'typeorm';
import { EnrollmentDto, GradeItemDto } from './dto/create-enrollment.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

const TIPO_CANDIDATURA_SIGLA_POS_GRADUACAO = ['MST', 'DTR'] as const;
const TIPO_CANDIDATURA_SIGLA_GRADUACAO = ['LIC'] as const;

@Injectable()
export class EnrollmentService {
  private logger = new Logger(EnrollmentService.name);
  constructor(private readonly dataSource: DataSource) { }

  async enrollment(enrollmentDto: EnrollmentDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const preRegistration = await this.findPreRegistration(queryRunner, enrollmentDto);
      if (!preRegistration) {
        throw new HttpException('Nenhum dado de pré-inscrição encontrado', HttpStatus.NOT_FOUND);
      }

      const candidateTypeSigla = await this.findCandidateTypeSigla(
        queryRunner,
        preRegistration.codigo_tipo_candidatura,
      );
      if (!candidateTypeSigla) {
        throw new HttpException('Tipo de candidatura não encontrado', HttpStatus.BAD_REQUEST);
      }

      const isGraduacao = TIPO_CANDIDATURA_SIGLA_GRADUACAO.includes(candidateTypeSigla as any);
      const isPosGraduacao = TIPO_CANDIDATURA_SIGLA_POS_GRADUACAO.includes(candidateTypeSigla as any);
      if (!isGraduacao && !isPosGraduacao) {
        throw new HttpException('Tipo de candidatura inválido para matrícula', HttpStatus.BAD_REQUEST);
      }

      const admissionCode = await this.findAdmissionCode(queryRunner, enrollmentDto);
      if (!admissionCode) {
        throw new HttpException('Aluno Não Admitido', HttpStatus.NOT_FOUND);
      }

      const enrollementCode = await this.findEnrollementCode(queryRunner, admissionCode);
      if (enrollementCode) {
        throw new HttpException('Aluno já possui matrícula', HttpStatus.BAD_REQUEST);
      }

      if (!enrollmentDto.anoLectivo) {
        throw new BadRequestException('Ano Lectivo não informado');
      }
      const codAnoActual = await this.findAcademicYear(queryRunner, enrollmentDto);
      if (!codAnoActual) {
        throw new BadRequestException('Não existe ano letivo ativo');
      }

      const {
        user_id: userId,
        curso_candidatura: codCurso,
        codigo_turno: codPeriodo,
      } = preRegistration;

      const canal = await this.findCanalCode(queryRunner, userId);
      const codMatricula = await this.criarMatricula(queryRunner, admissionCode, codCurso, canal);

      const gradesParams = {
        grades: enrollmentDto.grades,
        codMatricula,
        codAnoActual,
        codPeriodo,
        canal,
        userId,
      };

      if (isGraduacao) {
        await this.processarGradesGraduacao(queryRunner, gradesParams);
      } else {
        await this.processarGradesPosGraduacao(queryRunner, gradesParams);
      }

      await this.atualizarUsername(queryRunner, userId, codMatricula);

      await queryRunner.commitTransaction();
      return {
        message: 'Matrícula efetuada com sucesso',
        data: { codMatricula },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(error.message, error.stack);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Erro inesperado ao processar matrícula', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      await queryRunner.release();
    }
  }

  // ---------- Licenciatura: uma confirmação por semestre ----------
  private async processarGradesGraduacao(
    queryRunner: QueryRunner,
    params: {
      grades: GradeItemDto[];
      codMatricula: number;
      codAnoActual: number;
      codPeriodo: number;
      canal: number;
      userId: number;
    },
  ): Promise<void> {
    const { grades, codMatricula, codAnoActual, codPeriodo, canal, userId } = params;
    const { primeiroSemestre, segundoSemestre } = this.separarGradesPorSemestre(grades);

    const semestres = [
      { id: 1, disciplinas: primeiroSemestre },
      { id: 2, disciplinas: segundoSemestre },
    ];

    for (const item of semestres) {
      if (item.disciplinas.length === 0) continue;

      const codConfirmacaoAtual = await this.criarConfirmacao(queryRunner, {
        codMatricula,
        codAnoLectivo: codAnoActual,
        canal,
        semestre: item.id,
      });

      for (const codigoGrade of item.disciplinas) {
        await this.inserirGradeCurricular(queryRunner, {
          codigoGrade,
          codConfirmacao: codConfirmacaoAtual,
          codMatricula,
          canal,
          codAnoActual,
          codPeriodo,
          userId,
        });
      }
    }
  }

  // ---------- Pós-graduação: uma única confirmação para todas as disciplinas ----------
  private async processarGradesPosGraduacao(
    queryRunner: QueryRunner,
    params: {
      grades: GradeItemDto[];
      codMatricula: number;
      codAnoActual: number;
      codPeriodo: number;
      canal: number;
      userId: number;
    },
  ): Promise<void> {
    const { grades, codMatricula, codAnoActual, codPeriodo, canal, userId } = params;
    const { primeiroSemestre, segundoSemestre } = this.separarGradesPorSemestre(grades);
    const codigosGradeUnicos = [...new Set([...primeiroSemestre, ...segundoSemestre])];

    if (codigosGradeUnicos.length === 0) return;

    const codConfirmacaoAtual = await this.criarConfirmacao(queryRunner, {
      codMatricula,
      codAnoLectivo: codAnoActual,
      canal,
    });

    for (const codigoGrade of codigosGradeUnicos) {
      await this.inserirGradeCurricular(queryRunner, {
        codigoGrade,
        codConfirmacao: codConfirmacaoAtual,
        codMatricula,
        canal,
        codAnoActual,
        codPeriodo,
        userId,
      });
    }
    // gerar pagamento
    // se tiver taxa vai gerar taxa
    // se nao vai gerar a primeira mensalidade

  }

  private separarGradesPorSemestre(grades: GradeItemDto[]) {
    const resultado = grades.reduce(
      (acc, grade) => {
        const semestre = grade.semestre;
        const duracao = grade.duracaoDisciplina.toUpperCase();
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
      { primeiroSemestre: [] as number[], segundoSemestre: [] as number[] },
    );
    return {
      primeiroSemestre: [...new Set(resultado.primeiroSemestre)],
      segundoSemestre: [...new Set(resultado.segundoSemestre)],
    };
  }

  private async criarMatricula(
    queryRunner: QueryRunner,
    admissionCode: number,
    codCurso: number,
    canal: number,
  ): Promise<number> {
    const [maxAluno] = await queryRunner.query(
      `SELECT NVL(MAX(TO_NUMBER("NUMEROALUNO")), 0) as maxAluno FROM FK2_TB_MATRICULAS`,
    );
    const nAluno = Number(maxAluno.MAXALUNO) + 1;

    const matriculaResult = await queryRunner.query(
      `INSERT INTO FK2_TB_MATRICULAS (
        "CODIGO_ALUNO", "DATA_MATRICULA", "CODIGO_CURSO",
        "CODIGOPAGAMENTO", "NUMEROALUNO", "ESTADO_MATRICULA", "CANAL", "UPDATED_AT"
      ) VALUES (
        :admissionCode, SYSDATE, :codCurso,
        0, :nAluno, 'inactivo', :canal, SYSDATE
      ) RETURNING CODIGO INTO :outId`,
      {
        admissionCode,
        codCurso,
        nAluno,
        canal,
        outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      } as any,
    );

    return matriculaResult.outId[0];
  }

  private async criarConfirmacao(
    queryRunner: QueryRunner,
    params: { codMatricula: number; codAnoLectivo: number; canal: number; semestre?: number | null },
  ): Promise<number> {
    const { codMatricula, codAnoLectivo, canal, semestre = null } = params;

    const result = await queryRunner.query(
      `INSERT INTO FK2_TB_CONFIRMACOES (
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
      RETURNING CODIGO INTO :outId`,
      {
        codMatricula,
        codAnoLectivo,
        canal,
        semestre,
        outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      } as any,
    );

    return result.outId[0];
  }

  private async inserirGradeCurricular(
    queryRunner: QueryRunner,
    params: {
      codigoGrade: number;
      codConfirmacao: number;
      codMatricula: number;
      canal: number;
      codAnoActual: number;
      codPeriodo: number;
      userId: number;
    },
  ): Promise<void> {
    const { codigoGrade, codConfirmacao, codMatricula, canal, codAnoActual, codPeriodo, userId } = params;

    const [exists] = await queryRunner.query(
      `SELECT 1 FROM FK2_TB_GRADE_CURRICULAR_ALUNO WHERE "CODIGO_GRADE_CURRICULAR" = :codigoGrade AND "CODIGO_MATRICULA" = :codMatricula`,
      [codigoGrade, codMatricula],
    );
    if (exists) {
      this.logger.warn(`Grade ${codigoGrade} já existe para matrícula ${codMatricula}`);
      return;
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

    await queryRunner.query(
      `INSERT INTO FK2_TB_GRADE_CURRICULAR_ALUNO (
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
      )`,
      {
        codigoGrade,
        codConfirmacao,
        codMatricula,
        canal,
        codAnoLectivo: codAnoActual,
        userId,
        refHorario,
      } as any,
    );
  }

  private async atualizarUsername(queryRunner: QueryRunner, userId: number, codMatricula: number): Promise<void> {
    const newUsername = `uma${codMatricula}`;
    await queryRunner.query(
      `UPDATE FK2_USERS SET "USERNAME" = :newUsername WHERE "ID" = :userId`,
      { newUsername, userId } as any,
    );
  }

  private async findAdmissionCode(queryRunner: QueryRunner, enrollmentDto: EnrollmentDto): Promise<number | null> {
    const admission = await queryRunner.query(
      `SELECT "CODIGO" FROM FK2_TB_ADMISSAO WHERE "PRE_INCRICAO" = :codPreInscricao`,
      [enrollmentDto.codPreInscricao],
    );
    return admission.length > 0 ? admission[0].CODIGO : null;
  }

  private async findEnrollementCode(queryRunner: QueryRunner, admissionCode: number): Promise<number | null> {
    const enrolled = await queryRunner.query(
      `SELECT CODIGO FROM FK2_TB_MATRICULAS WHERE "CODIGO_ALUNO" = :codAmissao`,
      [admissionCode],
    );
    return enrolled.length > 0 ? enrolled[0].CODIGO : null;
  }

  private async findPreRegistration(
    queryRunner: QueryRunner,
    enrollmentDto: EnrollmentDto,
  ): Promise<{ codigo_tipo_candidatura: number; curso_candidatura: number; codigo_turno: number; user_id: number } | null> {
    const preResult = await queryRunner.query(
      `SELECT
        CODIGO_TIPO_CANDIDATURA,
        CURSO_CANDIDATURA, CODIGO_TURNO, USER_ID FROM FK2_TB_PREINSCRICAO WHERE "CODIGO" = :codPreInscricao`,
      [enrollmentDto.codPreInscricao],
    );
    return preResult.length > 0 ? (toLowerCaseKeys(preResult[0]) as any) : null;
  }

  private async findCanalCode(queryRunner: QueryRunner, userId: number): Promise<number> {
    const canal = await queryRunner.query(`SELECT "CANAL" FROM FK2_USERS WHERE "ID" = :userId`, [userId]);
    return canal.length > 0 ? canal[0].CANAL : 0;
  }

  private async findCandidateTypeSigla(queryRunner: QueryRunner, candidateTypeCode: number): Promise<string | null> {
    const type = await queryRunner.query(
      `SELECT SIGLA FROM FK2_TB_TIPO_CANDIDATURA WHERE ID = :candidateTypeCode`,
      [candidateTypeCode],
    );
    return type.length > 0 ? type[0].SIGLA : null;
  }

  private async findAcademicYear(queryRunner: QueryRunner, enrollmentDto: EnrollmentDto): Promise<number | null> {
    const anoLectivo = await queryRunner.query(
      `SELECT CODIGO
       FROM FK2_TB_ANO_LECTIVO
       WHERE CODIGO = :anoLectivo AND (estado = 'Activo' or FASE_ANOLECTIVO = 'USAVEL' or FASE_ANOLECTIVO = 'RASCUNHO' or FASE_ANOLECTIVO ='CONFIGURAVEL')`,
      { anoLectivo: enrollmentDto.anoLectivo } as any,
    );
    return anoLectivo.length > 0 ? anoLectivo[0].CODIGO : null;
  }
}