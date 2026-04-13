import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateStudentEnrollmentUC } from './dto/create-student-enrollment-uc';
import { STATUS_GRADE } from '../common/enums/status.grade';

@Injectable()
export class StudentsEnrollmentUCService {
  constructor(private readonly dataSource: DataSource) {}
  async enrollmentUc(dto: CreateStudentEnrollmentUC) {
    const { codigoAnoLectivo, codigoGrade, codigoMatricula, epoca } = dto;
    //INSCRICOES

    //VERIFICAR SE JÁ EXISTE UMA CADEIRA
    const sqlGradeAluno = `SELECT CODIGO
    FROM FK2_TB_GRADE_CURRICULAR_ALUNO
    WHERE 1=1
    AND CODIGO_GRADE_CURRICULAR = :codigoGrade
    AND CODIGO_STATUS_GRADE_CURRICULAR IN (2,3)
    `;
    const resultadoGradeAluno = await this.dataSource.query(sqlGradeAluno, {
      codigoGrade: codigoGrade,
    } as any);

    if (resultadoGradeAluno.length > 0) {
      throw new BadRequestException('A grade selecionada já está matriculada');
    }
    //ADICIONAR ALGUMAS VERIFICAÇÕES DEPOIS

    //PEGAR O SEMESTRE NA GRADE CURRICULAR
    const sqlPegarSemestre = `SELECT CODIGO_SEMESTRE FROM FK2_TB_GRADE_CURRICULAR WHERE CODIGO = :codigoGrade`;
    const resultadoSemestre = await this.dataSource.query(sqlPegarSemestre, {
      codigoGrade: codigoGrade,
    } as any);

    const semestre = resultadoSemestre?.[0].CODIGO_SEMESTRE ?? null;

    //PEGAR O CODIGO DA CONFIRMACAO
    const sqlConfirmacao = `SELECT CODIGO
    FK2_TB_CONFIRMACOES
    WHERE 1=1
    AND CODIGO_MATRICULA =:codigoMatricula
    AND CODIGO_ANO_LECTIVO = :codigoAnoLectivo
    AND (SEMESTRE =:semestre or :semestre is null)`;

    const resultadoConfirmacao = await this.dataSource.query(sqlConfirmacao, {
      codigoMatricula,
      codigoAnoLectivo,
      semestre,
    } as any);
    console.log('Grade', resultadoConfirmacao);
    const notExistsConfirmacao =
      !resultadoConfirmacao || resultadoConfirmacao.length == 0;
    if (notExistsConfirmacao) {
      throw new BadRequestException('Não existe nenhuma confirmação nesse ano');
    }
    const confirmacao = resultadoConfirmacao[0]?.CODIGO;
    //INSCREVER NA GRADE CURRICULAR DO ALUNO
    const sqlInserirGrade = `
    INSERT
    INTO FK2_TB_GRADE_CURRICULAR_ALUNO (
      CODIGO_GRADE_CURRICULAR,
      CODIGO_CONFIRMACAO,
      CODIGO_MATRICULA,
      ESTADO,
      CREATED_AT,
      CANAL,
      CODIGO_STATUS_GRADE_CURRICULAR,
      CODIGO_ANO_LECTIVO,
      EPOCA,
      OBSERVACAO,
      CODIGO_UTILIZADOR,
      REF_UTILIZADOR
    )
    VALUES (
      :codigo_grade_curricular,
      :codigo_confirmacao,
      :codigo_matricula,
      :estado,
      sysdate,
      :canal,
      :codigo_status_grade_curricular,
      :codigo_ano_lectivo,
      :epoca,
      :observacao,
      :codigo_utilizador
    )
    `;
    //INSERIR A GRADE NA GRADE CURRICULAR DO ALUNO
    await this.dataSource.query(sqlInserirGrade, {
      codigo_grade_curricular: codigoGrade,
      codigo_confirmacao: confirmacao,
      codigo_matricula: codigoMatricula,
      estado: 1,
      canal: 7,
      codigo_status_grade_curricular: STATUS_GRADE.CURSO,
      codigo_ano_lectivo: codigoAnoLectivo,
      epoca: epoca,
    } as any);
  }
}
