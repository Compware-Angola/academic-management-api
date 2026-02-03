import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

import { DataSource } from 'typeorm';
import { EnrollmentDto, GradeItemDto } from './dto/create-enrollment.dto';

@Injectable()
export class EnrollmentService {
  private logger = new Logger(EnrollmentService.name);
  constructor(private readonly dataSource: DataSource) {}

  async enrollment(enrollmentDto: EnrollmentDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const { codPreInscricao, grades } = enrollmentDto;
    const { primeiroSemestre, segundoSemestre } =
      this.separarGradesPorSemestre(grades);

    try {
      // 🔹 1. Buscar admissão
      const admissaoResult = await queryRunner.query(
        `SELECT "CODIGO" FROM FK2_TB_ADMISSAO WHERE "PRE_INCRICAO" = :codPreInscricao`,
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

      // 🔹 4. Canal do usuário
      const [userResult] = await queryRunner.query(
        `SELECT "CANAL" FROM FK2_USERS WHERE "ID" = :userId`,
        [userId],
      );
      const canal = userResult?.CANAL ?? 0;

      // 🔹 5. Gerar códigos de Matrícula (⚠️ Trocar por Sequence no futuro)
      const [maxMat] = await queryRunner.query(
        `SELECT NVL(MAX(TO_NUMBER("CODIGO")), 0) as maxCod FROM FK2_TB_MATRICULAS`,
      );
      const [maxAluno] = await queryRunner.query(
        `SELECT NVL(MAX(TO_NUMBER("NUMEROALUNO")), 0) as maxAluno FROM FK2_TB_MATRICULAS`,
      );

      const codMatricula = Number(maxMat.MAXCOD) + 1;
      const nAluno = Number(maxAluno.MAXALUNO) + 1;

      // 🔹 6. Criar matrícula base
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

      // 🔹 7. Buscar Ano lectivo activo
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

      // 🔹 8. Preparar contadores para Confirmações e Grades
      const [maxConfResult] = await queryRunner.query(
        `SELECT NVL(MAX(TO_NUMBER("CODIGO")), 0) as maxConf FROM FK2_TB_CONFIRMACOES`,
      );
      let incrementadorConfirmacao = Number(maxConfResult.MAXCONF);

      const [maxGradeResult] = await queryRunner.query(
        `SELECT NVL(MAX(CODIGO), 0) as maxGrade FROM FK2_TB_GRADE_CURRICULAR_ALUNO`,
      );
      let incrementadorGrade = Number(maxGradeResult.MAXGRADE);

      // Estrutura para iterar os dois semestres
      const semestres = [
        { id: 1, disciplinas: primeiroSemestre },
        { id: 2, disciplinas: segundoSemestre },
      ];

      for (const item of semestres) {
        // Só processa se houver disciplinas para o semestre
        if (item.disciplinas.length === 0) continue;

        // 🔹 9. Criar Confirmação para o Semestre Atual (1 ou 2)
        incrementadorConfirmacao++;
        const codConfirmacaoAtual = incrementadorConfirmacao;

        await queryRunner.query(
          `INSERT INTO FK2_TB_CONFIRMACOES (
            "CODIGO", "CODIGO_MATRICULA", "DATA_CONFIRMACAO", "CODIGO_ANO_LECTIVO",
            "ESTADO", "CLASSE", "CADEIRANTE", "CANAL", "SEMESTRE"
          ) VALUES (
            :codConfirmacao, :codMatricula, SYSDATE, :codAnoActual,
            0, 1, 'NAO', :canal, :numSemestre
          )`,
          [codConfirmacaoAtual, codMatricula, codAnoActual, canal, item.id],
        );

        // 🔹 10. Inserir disciplinas da grade deste semestre
        for (const codigoGrade of item.disciplinas) {
          incrementadorGrade++;

          // Verificar se a grade já existe para evitar erros de duplicidade
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

          // Buscar Horário
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

          // Inserir na Grade Curricular do Aluno (EPOCA fixa em 1 conforme solicitado)
          // await queryRunner.query(
          //   `INSERT INTO FK2_TB_GRADE_CURRICULAR_ALUNO (
          //     "CODIGO_GRADE_CURRICULAR", "CODIGO_CONFIRMACAO", "CODIGO_MATRICULA",
          //     "ESTADO", "NOTA", "CREATED_AT", "CANAL",
          //     "CODIGO_STATUS_GRADE_CURRICULAR", "CODIGO_ANO_LECTIVO",
          //     "USER_ID", "EPOCA", "UPDATED_AT", "EQUIVALENCIA", "REF_HORARIO", "CODIGO"
          //   ) VALUES (
          //     :codigoGrade, :codConfirmacao, :codMatricula,
          //     0, 0, SYSDATE, :canal,
          //     4, :codAnoActual,
          //     :userId, 1, SYSDATE, 0, :refHorario, :gradealunoincre
          //   )`,
          //   [
          //     codigoGrade,
          //     codConfirmacaoAtual,
          //     codMatricula,
          //     canal,
          //     codAnoActual,
          //     userId,
          //     refHorario,
          //     incrementadorGrade,
          //   ],
          // );

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
              codConfirmacaoAtual,
              codMatricula,
              canal,
              codAnoActual,
              userId,
              refHorario,
              incrementadorGrade,
            ],
          );
        }
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Matrícula e confirmações dos dois semestres concluídas',
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
}
