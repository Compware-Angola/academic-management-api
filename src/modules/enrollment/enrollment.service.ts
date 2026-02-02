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
      // 🔹 1. Buscar admissão
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

      // 🔹 2. Verificar se já está matriculado
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

      // 🔹 3. Buscar dados da pré-inscrição
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

      // 🔹 4. Canal do usuário
      const [userResult] = await queryRunner.query(
        `SELECT "CANAL" FROM FK2_USERS WHERE "ID" = :userId`,
        [userId],
      );

      const canal = userResult?.CANAL ?? 0;

      // 🔹 5. Gerar códigos (⚠️ TROCAR POR SEQUENCE NO FUTURO)
      const [maxMat] = await queryRunner.query(
        `SELECT NVL(MAX(TO_NUMBER("CODIGO")), 0) as maxCod FROM FK2_TB_MATRICULAS`,
      );

      const [maxAluno] = await queryRunner.query(
        `SELECT NVL(MAX(TO_NUMBER("NUMEROALUNO")), 0) as maxAluno FROM FK2_TB_MATRICULAS`,
      );

      const codMatricula = Number(maxMat.MAXCOD) + 1;
      const nAluno = Number(maxAluno.MAXALUNO) + 1;

      // 🔹 6. Criar matrícula
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

      // 🔹 7. Ano lectivo ativo
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

      // 🔹 8. Criar confirmação
      const [maxConf] = await queryRunner.query(
        `SELECT NVL(MAX(TO_NUMBER("CODIGO")), 0) as maxConf FROM FK2_TB_CONFIRMACOES`,
      );

      const codConfirmacao = Number(maxConf.MAXCONF) + 1;

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

      // 🔹 9. Remover grades duplicadas
      const uniqueGrades = [...new Set(grades)];
      const [maxConfgrade] = await queryRunner.query(
        `SELECT MAX(CODIGO) as maxConf FROM FK2_TB_GRADE_CURRICULAR_ALUNO`,
      );
      console.log(maxConfgrade);
      let gradealunoincre = maxConfgrade?.MAXCONF;
      for (const codigoGrade of uniqueGrades) {
        gradealunoincre = gradealunoincre + 1;

        // 🔍 Verificar se já existe
        const [exists] = await queryRunner.query(
          `SELECT 1 FROM FK2_TB_GRADE_CURRICULAR_ALUNO
         WHERE "CODIGO_GRADE_CURRICULAR" = :codigoGrade
           AND "CODIGO_MATRICULA" = :codMatricula`,
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
        // ultimo id da grade curricular do aluno

        await queryRunner.query(
          `INSERT INTO FK2_TB_GRADE_CURRICULAR_ALUNO (
           "CODIGO_GRADE_CURRICULAR", "CODIGO_CONFIRMACAO", "CODIGO_MATRICULA",
           "ESTADO", "NOTA", "CREATED_AT", "CANAL",
           "CODIGO_STATUS_GRADE_CURRICULAR", "CODIGO_ANO_LECTIVO",
           "USER_ID", "EPOCA", "UPDATED_AT", "EQUIVALENCIA", "REF_HORARIO","CODIGO"
         ) VALUES (
           :codigoGrade, :codConfirmacao, :codMatricula,
           0, 0, SYSDATE, :canal,
           4, :codAnoActual,
           :userId, 1, SYSDATE, 0, :refHorario,:gradealunoincre
         )`,
          [
            codigoGrade,
            codConfirmacao,
            codMatricula,
            canal,
            codAnoActual,
            userId,
            refHorario,
            gradealunoincre,
          ],
        );
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Matrícula criada com sucesso',
        data: { codMatricula, nAluno },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(error.message, error.stack);

      if (error instanceof HttpException) throw error;

      throw new HttpException(
        'Erro inesperado',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
