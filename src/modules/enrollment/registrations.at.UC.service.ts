import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DecodedUserPayload } from '../common/types/token-validation-response.interface';
import { EnrollmentRegistrationsUCDto } from './dto/registrations.at.UC.dto';



@Injectable()
export class EnrollmentRegistrationsUCService {  

  constructor(private readonly dataSource: DataSource) {}
  async  registerGradesUc(
    body: EnrollmentRegistrationsUCDto
  ) {
    const { codPreInscricao, grades } = body;

    if (!codPreInscricao) {
      throw new BadRequestException('codPreInscricao é obrigatório');
    }

    if (!Array.isArray(grades) || grades.length === 0) {
      throw new BadRequestException('É necessário enviar pelo menos uma grade curricular');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Buscar código de admissão (codAmissao)
      const admissao = await queryRunner.query(
        `SELECT CODIGO
         FROM FK2_TB_ADMISSAO 
         WHERE pre_incricao = :codPreInscricao`,
        { codPreInscricao } as any,
      );

      if (!admissao) {
        throw new BadRequestException('Aluno não admitido / Pré-inscrição não encontrada');
      }

      const codAmissao = admissao.codigo || admissao[0]?.codigo || admissao[0]?.CODIGO;

      // 2. Verificar se já existe matrícula
      const countMat = await queryRunner.query(
        `SELECT COUNT(*) AS cnt
         FROM  FK2_TB_MATRICULAS
         WHERE Codigo_Aluno = :codAmissao`,
        { codAmissao } as any,
      );

       console.log(countMat);
       

      if (Number(countMat[0].CNT) === 0) {
        throw new BadRequestException('Matrícula não encontrada para o aluno da pré-inscrição fornecida');
      }

      // 3. Buscar dados da pré-inscrição e canal do usuário
      const preInscr = await queryRunner.query(
        `SELECT user_id, Curso_Candidatura, Codigo_Turno
         FROM FK2_TB_PREINSCRICAO
         WHERE Codigo = :codPreInscricao`,
        { codPreInscricao } as any,
      );
      console.log(preInscr);
      

      if (!preInscr) {
        throw new BadRequestException('Dados da pré-inscrição não encontrados');
      }

      const userId    = preInscr[0].user_id || preInscr[0].USER_ID;
      const codCurso  = preInscr[0].Curso_Candidatura || preInscr[0].CURSO_CANDIDATURA;
      const codPeriodo = preInscr[0].Codigo_Turno || preInscr[0].CODIGO_TURNO;

      const usuario = await queryRunner.query(
        `SELECT canal FROM FK2_USERS WHERE id = :userId`,
        { userId } as any,
      );

      const codCanal = usuario?.canal ?? 1; 

      const matricula = await queryRunner.query(
        `SELECT CODIGO, Codigo_Curso
         FROM FK2_TB_MATRICULAS
         WHERE Codigo_Aluno = :codAmissao`,
        { codAmissao } as any,
      );

      if (!matricula) {
        throw new BadRequestException('Matrícula não encontrada para confirmação');
      }

      const codMatricula = matricula[0].CODIGO;

      // 5. Buscar ano letivo ativo
      const [anoAtual] = await queryRunner.query(
        `SELECT CODIGO
         FROM FK2_TB_ANO_LECTIVO
         WHERE estado = 'Activo'
         FETCH FIRST 1 ROWS ONLY`,
      );

      if (!anoAtual) {
        throw new BadRequestException('Não existe ano letivo ativo');
      }

      const codAnoActual = anoAtual.CODIGO;

      // 6. Verificar se já existe confirmação para essa matrícula + ano
      const countConf = await queryRunner.query(
        `SELECT COUNT(*) as cnt
         FROM FK2_TB_CONFIRMACOES
         WHERE Codigo_Matricula = :codMatricula
           AND Codigo_Ano_lectivo = :codAnoActual`,
        { codMatricula, codAnoActual } as any,
      );

      if (Number(countConf.cnt) > 0) {
        throw new BadRequestException('Já existe uma confirmação para esta matrícula neste ano letivo');
      }

      // 7. Gerar próximo código de confirmação
      const [maxConf] = await queryRunner.query(
        `SELECT MAX(CODIGO) as maxcod
         FROM FK2_TB_CONFIRMACOES
         WHERE REGEXP_LIKE(Codigo, '^[0-9]+$')`,
      );
      console.log(maxConf);
      

      const codConfirmacao = Number(maxConf.MAXCOD) + 1;

      // 8. Buscar duração do curso (fallback 5)
      let duracao = 5;
      try {
        const curso = await queryRunner.query(
          `SELECT duracao FROM FK2_TB_CURSOS WHERE Codigo = :codCurso`,
          { codCurso } as any,
        );
        duracao = curso?.DURACACAO ?? 5;
      } catch {}

      // 9. Buscar última classe confirmada (para incrementar)
       let classe = 1;
       let iSSameYear = false;
       let semestre = 1;
      try {
        const ultClasse = await queryRunner.query(
          `SELECT Classe
           FROM FK2_TB_CONFIRMACOES
           WHERE Codigo_Matricula = :codMatricula
             AND Estado = '1'
             AND Classe IS NOT NULL
           ORDER BY Classe DESC
           FETCH FIRST 1 ROWS ONLY`,
          { codMatricula } as any,
        );

        if (ultClasse?.CLASSE && ultClasse.CLASSE < duracao) {
          classe = Number(ultClasse.CLASSE);
        }

        else{
            throw new BadRequestException('O aluno já atingiu a classe máxima do curso, não pode ser confirmada nova classe.');
        }
      } catch {}

      // 10 Verificar se já existe confirmação para essa matrícula + ano letivo

      try {
        const countConfAno = await queryRunner.query(
          `SELECT COUNT(*) as cnt
           FROM FK2_TB_CONFIRMACOES
           WHERE Codigo_Matricula = :codMatricula
           AND Estado = '1'
             AND Codigo_Ano_lectivo = :codAnoActual`,
          { codMatricula, codAnoActual } as any,
        );
        console.log(countConfAno);
        

        if ( Number(countConfAno[0].CNT) != 0) {
            iSSameYear = true;
          
            

        }

      } catch {}
    
      // 10. Inserir confirmação

      // 11 . Buscar última classe confirmada (para incrementar) --- MOVED ABOVE ---

        classe = iSSameYear ? classe : classe + 1;
        semestre  = iSSameYear ? semestre + 1: semestre;


        if(semestre > 2){
            semestre = 1;
        }

        console.log(codConfirmacao, codMatricula, codAnoActual, classe, codCanal, semestre );
        
      await queryRunner.query(
        `INSERT INTO FK2_TB_CONFIRMACOES (
           Codigo, Codigo_Matricula, Data_Confirmacao,
           Codigo_Ano_lectivo, Estado, Classe,
           Cadeirante, canal, Semestre
         ) VALUES (
           :codConfirmacao, :codMatricula, SYSDATE,
           :codAnoActual, 0, :classe,
           'NAO', :codCanal, :semestre
         )`,
        { codConfirmacao, codMatricula, codAnoActual, classe, codCanal, semestre } as any,
      );

      // 11. Inserir grades curriculares do aluno
      for (const grade of grades) {
        const { codigoGrade, codigoHorario, descHorario } = grade;

        // Gerar JSON do horário (ref_horario)
        const refHorario = JSON.stringify({
          pk: codigoHorario,
          desc: descHorario || '',
        });

        // Gerar próximo código da grade do aluno
        const [maxGradeAl] = await queryRunner.query(
          `SELECT MAX(CODIGO) as maxcod
           FROM FK2_TB_GRADE_CURRICULAR_ALUNO
           WHERE REGEXP_LIKE(Codigo, '^[0-9]+$')`,
        );

        const codGradeCurricularAluno = Number(maxGradeAl.MAXCOD) + 1;

        await queryRunner.query(
          `INSERT INTO FK2_TB_GRADE_CURRICULAR_ALUNO (
             codigo, codigo_grade_curricular, codigo_confirmacao,
             codigo_matricula, estado, Nota,
             created_at, canal, Codigo_Status_Grade_Curricular,
             codigo_ano_lectivo, user_id, epoca,
             updated_at, equivalencia, ref_horario
           ) VALUES (
             :codGradeAl, :codigoGrade, :codConfirmacao,
             :codMatricula, 0, 0,
             SYSDATE, :codCanal, 2,
             :codAnoActual, :userId, 1,
             SYSDATE, 0, :refHorario
           )`,
          {
            codGradeAl: codGradeCurricularAluno,
            codigoGrade,
            codConfirmacao,
            codMatricula,
            codCanal,
            codAnoActual,
            userId,
            refHorario,
          } as any,
        );
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Confirmação criada com sucesso',
        data: {
          codConfirmacao,
          codMatricula,
          codAnoLectivo: codAnoActual,
          classe,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        'Erro ao confirmar matrícula e grades: ' + (error.message || 'Erro desconhecido'),
      );
    } finally {
      await queryRunner.release();
    }
  }
}