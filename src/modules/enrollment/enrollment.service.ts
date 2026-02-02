import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { EnrollmentDto } from './dto/create-enrollment.dto';

import { DataSource } from 'typeorm';

@Injectable()
export class EnrollmentService {
  private logger = new Logger(EnrollmentService.name);
  constructor(private readonly dataSource: DataSource) {}
  async enrollment(enrollmentDto: EnrollmentDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const { codPreInscricao, grades } = enrollmentDto;
    try {
      const admissaoResult = await queryRunner.query(
        `SELECT "CODIGO"
         FROM FK2_TB_ADMISSAO
         WHERE "PRE_INCRICAO" = :codPreInscricao`,
        [codPreInscricao],
      );
      if (admissaoResult.length === 0) {
        throw new HttpException('Aluno Não Admitido', HttpStatus.NOT_FOUND);
      }

      const codAmissao = admissaoResult[0].CODIGO;

      const [countResult] = await queryRunner.query(
        `SELECT COUNT(*) as cnt
         FROM FK2_TB_MATRICULAS
         WHERE "CODIGO_ALUNO" = :codAmissao`,
        [codAmissao],
      );

      if (Number(countResult.cnt) > 0) {
        throw new HttpException(
          'Já existe um aluno matrículado',
          HttpStatus.BAD_REQUEST,
        );
      }
      const preResult = await queryRunner.query(
        `SELECT "USER_ID", "CURSO_CANDIDATURA", "CODIGO_TURNO"
         FROM FK2_TB_PREINSCRICAO
         WHERE "CODIGO" = :codPreInscricao`,
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
        [1],
      );
      const canal = userResult?.CANAL ?? 0;
      const [maxMatResult] = await queryRunner.query(
        `SELECT NVL(MAX(TO_NUMBER("CODIGO")), 0) as maxCod
         FROM FK2_TB_MATRICULAS
         WHERE "CODIGO" IS NOT NULL`,
      );

      const [maxAlunoResult] = await queryRunner.query(
        `SELECT NVL(MAX(TO_NUMBER("NUMEROALUNO")), 0) as maxAluno
         FROM FK2_TB_MATRICULAS
         WHERE "NUMEROALUNO" IS NOT NULL`,
      );

      const codMatricula = Number(maxMatResult.MAXCOD) + 1;
      const nAluno = Number(maxAlunoResult.MAXALUNO) + 1;

      await queryRunner.query(
        `INSERT INTO FK2_TB_MATRICULAS (
           "CODIGO", "CODIGO_ALUNO", "DATA_MATRICULA", "CODIGO_CURSO",
           "CODIGOPAGAMENTO", "NUMEROALUNO", "ESTADO_MATRICULA", "CANAL", "UPDATED_AT"
         ) VALUES (
           :codMatricula, :codAmissao, SYSDATE, :codCurso,
           0, :nAluno, 'inactivo', :canal, SYSDATE
         )`,
        [codMatricula, codAmissao, codCurso, nAluno, canal],
      );

      const [anoResult] = await queryRunner.query(
        `SELECT "CODIGO"
         FROM FK2_TB_ANO_LECTIVO
         WHERE "ESTADO" = 'Activo'
         FETCH FIRST 1 ROWS ONLY`,
      );
      if (!anoResult) {
        throw new HttpException(
          'Nenhum ano lectivo activo encontrado',
          HttpStatus.NOT_FOUND,
        );
      }
      const codAnoActual = anoResult.CODIGO;

      const [maxConfResult] = await queryRunner.query(
        `SELECT NVL(MAX(TO_NUMBER("CODIGO")), 0) as maxConf
         FROM FK2_TB_CONFIRMACOES`,
      );
      const codConfirmacao = Number(maxConfResult.MAXCONF) + 1;

      await queryRunner.query(
        `INSERT INTO FK2_TB_CONFIRMACOES (
           "CODIGO", "CODIGO_MATRICULA", "DATA_CONFIRMACAO", "CODIGO_ANO_LECTIVO",
           "ESTADO", "CLASSE", "CADEIRANTE", "CANAL"
         ) VALUES (
           :codConfirmacao, :codMatricula, SYSDATE, :codAnoActual,
           0, 1, 'NAO', :canal
         )`,
        [codConfirmacao, codMatricula, codAnoActual, canal],
      );
      for (const codigoGrade of grades) {
        let refHorario = '';

        const horarioResult = await queryRunner.query(
          `SELECT "PK_HORARIO", "DESIGNACAO"
           FROM FK2_MGH_TB_HORARIO
           WHERE "ACTIVE_STATE" = '1'
             AND "APENASPRIMEIROANO" = '1'
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
             "CODIGO_GRADE_CURRICULAR", "CODIGO_CONFIRMACAO", "CODIGO_MATRICULA",
             "ESTADO", "NOTA", "CREATED_AT", "CANAL",
             "CODIGO_STATUS_GRADE_CURRICULAR", "CODIGO_ANO_LECTIVO",
             "USER_ID", "EPOCA", "UPDATED_AT", "EQUIVALENCIA", "REF_HORARIO"
           ) VALUES (
             :codigoGrade, :codConfirmacao, :codMatricula,
             0, 0, SYSDATE, :canal,
             4, :codAnoActual,
             :userId, 1, SYSDATE, 0, :refHorario
           )`,
          [
            codigoGrade,
            codConfirmacao,
            codMatricula,
            canal,
            codAnoActual,
            userId,
            refHorario,
          ],
        );
      }

      await queryRunner.commitTransaction();
      return {
        message: 'Matrícula criada com sucesso',
        data: {
          codMatricula,
          nAluno,
        },
      };
    } catch (error) {
      this.logger.error(error.message, error.stack);
      await queryRunner.rollbackTransaction();

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Erro inesperado`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
