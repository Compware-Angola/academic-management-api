import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { GeneralAgendaDto } from "./dto/list-general-agenda.dto";


@Injectable()
export class GenaralAgendaService {
    constructor(private readonly dataSource: DataSource) { }


    async findAll(dto: GeneralAgendaDto) {
        const { horario, anoLectivo, semestre, gradeCurricular, gradeCurricularTurma } = dto
        let listaPauta: any;
        let grade: any;
        if (horario) {
            grade = await this.findGradeCurricularByCodigo(gradeCurricular)
            if (grade) {
                listaPauta = await this.carregarPautaHorario(grade, horario, anoLectivo)
            }

        } else {
            grade = await this.findGradeCurricularByCodigo(gradeCurricularTurma)
            if (grade) {
                listaPauta = await this.carregarPauta(grade, horario, anoLectivo)
            }

        }


    }

    private async findGradeCurricularByCodigo(pk_grade: number) {

        const grade = await this.dataSource.query(`
    SELECT *
    FROM FK2_TB_GRADE_CURRICULAR gdc
    WHERE gdc.CODIGO = :pk_grade 
   
  `, [pk_grade]);
        return grade[0]

    }

    private async carregarPautaHorario(grade: any, scheduleId: number, anoCorrente: number) {
        let pautaGeral: any
        const schedule = await this.getSchedule(scheduleId)
        if (schedule) {
            const listaDeEstudanteDoHorario = await this.findEstudantesByHorarioAndAnoLectivo(grade.CODIGO_CURSO, anoCorrente, scheduleId)
            if (listaDeEstudanteDoHorario.length > 0) {
                for (const estudante of listaDeEstudanteDoHorario) {
                    const gradeDoEstudante = await this.retornarGradeAvaliadaByGrade(grade.CODIGO, anoCorrente, estudante.numero_matricula)
                    if (gradeDoEstudante) {
                        this.processarNotasHorario(estudante.NUMERO_DE_MATRICULA, grade)

                    }


                }
            }


        }

        return pautaGeral
    }
    private async carregarPauta(grade: any, turma: number, anoCorrente: number) {
        let pautaGeral: any
        const schedule = await this.findTurmasById(turma)
        if (schedule) {
            const listaDeEstudanteDoHorario = await this.findEstudantesByTurmaAndAnoLectivo(grade.CODIGO_CURSO, anoCorrente, turma)
            if (listaDeEstudanteDoHorario.length > 0) {
                for (const estudante of listaDeEstudanteDoHorario) {
                    const gradeDoEstudante = await this.retornarGradeAvaliadaByGrade(grade.CODIGO, anoCorrente, estudante.numero_matricula)
                    if (gradeDoEstudante) {
                        this.processarNotas(estudante.NUMERO_DE_MATRICULA, grade.CODIGO, anoCorrente)

                    }


                }
            }


        }

        return pautaGeral
    }




    private async getSchedule(pkHorario: number): Promise<any> {

        const schedule = await this.dataSource.query(`
            SELECT DISTINCT m FROM FK2_MGH_TB_HORARIO m
             WHERE m.PK_HORARIO  = :pkHorario 
              AND m.ACTIVE_STATE  = TRUE AND 
              m.FK_ESTADO_HORARIO_WF != 'ab' 
              ORDER BY m.DESIGNACAO  ASC"`, [pkHorario]);
    }

    private async findTurmasById(codigoTurma: number): Promise<any> {

        const schedule = await this.dataSource.query(`
           SELECT turma FROM FK2_TB_TURMAS turma WHERE turma.codigo = :codigoTurma`, [codigoTurma]);
    }

    private async findEstudantesByHorarioAndAnoLectivo(curso: number, ano_lectivo: number, pk_horario: number): Promise<any> {

        const students = await this.dataSource.query(`
            SELECT "
                             tm.Codigo AS numero_matricula,"
                             tp2.Nome_Completo AS nome,"
                             tc.Designacao AS curso,"
                             tp3.Designacao AS periudo"
                        FROM FK2_TB_MATRICULAS tm "
                        	INNER JOIN FK2_TB_ADMISSAO ta2 ON ta2.codigo = tm.Codigo_Aluno "
                        	INNER JOIN FK2_TB_PREINSCRICAO tp2 ON tp2.Codigo = ta2.pre_incricao "
                        	INNER JOIN FK2_TB_CURSOS tc ON tc.Codigo = tm.Codigo_Curso"
                        	INNER JOIN FK2_TB_PERIODOS tp3 ON tp3.Codigo = tp2.Codigo_Turno"
                        	WHERE tc.codigo = :curso and tm.Codigo IN ("
                        		SELECT DISTINCT "
                        			tgca.codigo_matricula"
                        		FROM FK2_MGH_TB_HORARIO mth  "
                        			INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca ON JSON_VALUE(tgca.ref_horario  , '$.pk') = mth.pk_horario "
                        			and mth.active_state =1 and mth.fk_estado_horario_wf !=4"
                        		WHERE "
                        			tgca.codigo_ano_lectivo =:ano_lectivo"
                        			AND tgca.Codigo_Status_Grade_Curricular in (1,2,3)"
                                          AND (tm.estado_matricula='activo')     "
                        			and mth.pk_horario =:pk_horario"
                        		GROUP BY "
                        			mth.designacao ,"
                        			tgca.codigo_matricula,"
                        			mth.pk_horario "
                        ) ORDER BY tp2.Nome_Completo ASC"
            `, [curso, ano_lectivo, pk_horario])
    }

    private async findEstudantesByTurmaAndAnoLectivo(curso: number, turma: number, ano_lectivo: number): Promise<any> {
        const students = await this.dataSource.query(`
             "
                    SELECT "
                         tm.Codigo AS numero_matricula,"
                         tp2.Nome_Completo AS nome,"
                         tc.Designacao AS curso,"
                         tp3.Designacao AS periudo"
                    FROM FK2_TB_MATRICULAS tm "
                    	INNER JOIN FK2_TB_ADMISSAO ta2 ON ta2.codigo = tm.Codigo_Aluno "
                    	INNER JOIN FK2_TB_PREINSCRICAO tp2 ON tp2.Codigo = ta2.pre_incricao "
                    	INNER JOIN FK2_TB_CURSOS tc ON tc.Codigo = tm.Codigo_Curso"
                    	INNER JOIN FK2_TB_PERIODOS tp3 ON tp3.Codigo = tp2.Codigo_Turno"
                    	WHERE tc.codigo = :curso and tm.Codigo IN ("
                    		SELECT DISTINCT "
                    			tgca.codigo_matricula"
                    		FROM FK2_TB_TURMAS tt "
                    			INNER JOIN FK2_TB_GRADE_CURRICULAR_ALUNO tgca ON tgca.turma = tt.Codigo "
                    		WHERE "
                    			tgca.codigo_ano_lectivo = :ano_lectivo"
                    			AND tgca.Codigo_Status_Grade_Curricular = 2"
                                      AND (tm.estado_matricula='activo')     "
                    			and tt.Codigo = :turma"
                    		GROUP BY "
                    			tt.Designacao,"
                    			tgca.codigo_matricula,"
                    			tt.Codigo "
                    ) ORDER BY tp2.Nome_Completo ASC"
            `, [curso, ano_lectivo, turma])

    }

    private async retornarGradeAvaliadaByGrade(grade: number, anoLectivo: number, numeroDeMatricula: number, obs = "%Migração%"): Promise<any> {
        const grade_aluno = await this.dataSource.query(`
            SELECT grades FROM TbGradeCurricularAluno grades
             WHERE  grades.codigoGradeCurricular.codigo= :grade
              AND grades.codigoStatusGradeCurricular.codigo IN(2,3)
               AND grades.codigoAnoLectivo.codigo = :anoLectivo 
               AND grades.codigoMatricula.codigo = :numeroDeMatricula  
               AND grades.observacao NOT LIKE :obs 
              ORDER BY grades.codigoGradeCurricular.codigoDisciplina.designacao ASC"
            `, [grade, anoLectivo, numeroDeMatricula, obs])
    }
    private async findOnePlanoByCursoAndAnoLectivo(codigoCurso: number, codigoAnoLectivo: number): Promise<any> {
        const planoCurso = await this.dataSource.query(`SELECT plano FROM
             FK2_TB_PLANO_CURRICULAR_CURSO plano
              WHERE (plano.codigoCurso.codigo = :codigoCurso OR 0 = :codigoCurso  )
               AND (plano.codigoAnoLectivo.codigo = :codigoAnoLectivo or 0 = :codigoAnoLectivo)`,[codigoCurso,codigoAnoLectivo])
               return planoCurso



    }
    private async findByPlanoAndUnidadeCurricular(plano: number, codigoUnidadeCurricular: number): Promise<any> {
   const planoUnidade = await this.dataSource.query(`SELECT grade from
     FK2_TB_PLANO_CURRICULAR_GRADE grade 
     WHERE grade.codigoPlanoCurricularCurso.codigo = :plano 
     AND grade.codigoGradeCurricular.codigo = :codigoUnidadeCurricular`,[plano,codigoUnidadeCurricular])
     return planoUnidade

    }
    private async processarNotasHorario(codigoMatricula: number, gradeAluno: any): Promise<any> {
        //Bicho papao ! ""
        let planoCurricularCurso: any = this.findOnePlanoByCursoAndAnoLectivo(gradeAluno.CODIGO_CURSO, gradeAluno.CODIGO_ANO_LECTIVO);

        let planoCurricularGrade = this.findByPlanoAndUnidadeCurricular(planoCurricularCurso.CODIGO, gradeAluno.CODIGO_GRADE_CURRICULAR);

    }

    
    private async processarNotas(codigoMatricula: number, gradeDoEstudante: number, anoCorrente: number): Promise<any> {
        //Bicho papao !  
    }
}
