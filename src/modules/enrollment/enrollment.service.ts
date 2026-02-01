import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EnrollmentDto } from './dto/create-enrollment.dto';

import { DataSource } from 'typeorm';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';
import { console } from 'inspector';

@Injectable()
export class EnrollmentService {
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
      const codAmissao = admissaoResult[0].codigo;
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
      const codMatricula = Number(maxMatResult.maxCod) + 1;
      const nAluno = Number(maxAlunoResult.maxAluno) + 1;
      console.log({ codMatricula, nAluno }, 'AQUI SEU CAO');
      return { codMatricula, nAluno };

      // console.log([codMatricula, codAmissao, codCurso, nAluno, canal]);

      // await queryRunner.query(
      //   `INSERT INTO FK2_TB_MATRICULAS (
      //      "Codigo", "CODIGO_ALUNO", "DATA_MATRICULA", "CODIGO_CURSO",
      //      "CODIGOPAGAMENTO", "NUMEROALUNO", "ESTADO_MATRICULA", "CANAL", "UPDATED_AT"
      //    ) VALUES (
      //      :codMatricula, :codAmissao, SYSDATE, :codCurso,
      //      0, :nAluno, 'inactivo', :canal, SYSDATE
      //    )`,
      //   [codMatricula, codAmissao, codCurso, nAluno, canal],
      // );
      // return {
      //   admissaoResult,
      //   countResult,
      //   preResult,
      //   userResult,
      //   maxMatResult,
      //   maxAlunoResult,
      // };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Erro inesperado: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
