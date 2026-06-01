import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IChangeShiftParams } from './dto/change-shift-params.dto';
import { toLowerCaseKeys } from '../util/toLowerCaseKeys';

@Injectable()
export class ChangeShiftService {

    constructor(private readonly dataSource: DataSource) { }

    async changeShift(params: IChangeShiftParams) {
        const { codigoMatricula, novoPeriodoCodigo, anoLectivoId } = params;

        // ====================== 1. VERIFICAR SE A MATRÍCULA EXISTE ======================
        const matriculaResult = await this.dataSource.query(
            `
            SELECT 
                m.CODIGO              AS codigo_matricula,
                m.ESTADO_MATRICULA    AS estado,
                p.CODIGO_TURNO        AS periodo_atual_codigo,
                pe.DESIGNACAO         AS periodo_atual,
                p.NOME_COMPLETO       AS nome_completo
            FROM FK2_TB_MATRICULAS m
            INNER JOIN FK2_TB_ADMISSAO a
                ON a.CODIGO = m.CODIGO_ALUNO
            INNER JOIN FK2_TB_PREINSCRICAO p
                ON p.CODIGO = a.PRE_INCRICAO
            INNER JOIN FK2_TB_PERIODOS pe
                ON pe.CODIGO = p.CODIGO_TURNO
            WHERE m.CODIGO = :codigoMatricula
            `,
            { codigoMatricula } as any,
        );

        if (!matriculaResult || matriculaResult.length === 0) {
            throw new NotFoundException('Este aluno não existe ou matrícula não encontrada');
        }

        const matricula = toLowerCaseKeys(matriculaResult[0]);

        // ====================== 2. VERIFICAR SE O NOVO PERÍODO EXISTE ======================
        const periodoResult = await this.dataSource.query(
            `
            SELECT 
                pe.CODIGO       AS codigo,
                pe.DESIGNACAO   AS designacao
            FROM FK2_TB_PERIODOS pe
            WHERE pe.CODIGO = :novoPeriodoCodigo
            `,
            { novoPeriodoCodigo } as any,
        );

        if (!periodoResult || periodoResult.length === 0) {
            throw new NotFoundException('O novo período/turno informado não foi encontrado');
        }

        const novoPeriodo = toLowerCaseKeys(periodoResult[0]);

        // Não faz sentido mudar para o mesmo turno
        if (matricula.periodo_atual_codigo === novoPeriodoCodigo) {
            throw new BadRequestException(
                `O aluno já está inscrito no turno "${novoPeriodo.designacao}"`,
            );
        }

        // ====================== 3. ATUALIZAR O TURNO NA PRÉ-INSCRIÇÃO ======================
        await this.dataSource.query(
            `
            UPDATE FK2_TB_PREINSCRICAO p
            SET p.CODIGO_TURNO = :novoPeriodoCodigo,
                p.UPDATED_AT   = SYSDATE
            WHERE p.CODIGO = (
                SELECT a.PRE_INCRICAO
                FROM FK2_TB_MATRICULAS m
                INNER JOIN FK2_TB_ADMISSAO a
                    ON a.CODIGO = m.CODIGO_ALUNO
                WHERE m.CODIGO = :codigoMatricula
            )
            `,
            { novoPeriodoCodigo, codigoMatricula } as any,
        );

        // ====================== 4. BUSCAR GRADES CURRICULARES ATIVAS DO ANO LECTIVO ======================
        const gradesResult = await this.dataSource.query(
            `
            SELECT 
                gca.CODIGO              AS codigo_grade_aluno,
                gca.REF_HORARIO         AS ref_horario_atual,
                gc.CODIGO_DISCIPLINA    AS codigo_disciplina,
                gc.CODIGO_CLASSE        AS codigo_classe,
                gc.CODIGO_CURSO         AS codigo_curso,
                gc.CODIGO               AS codigo_uc
            FROM FK2_TB_GRADE_CURRICULAR_ALUNO gca
            INNER JOIN FK2_TB_GRADE_CURRICULAR gc
                ON gc.CODIGO = gca.CODIGO_GRADE_CURRICULAR
            WHERE gca.CODIGO_MATRICULA         = :codigoMatricula
              AND gca.CODIGO_ANO_LECTIVO        = :anoLectivoId
              AND gca.CODIGO_STATUS_GRADE_CURRICULAR = 2
            `,
            { codigoMatricula, anoLectivoId } as any,
        );

        if (!gradesResult || gradesResult.length === 0) {
            return {
                success: true,
                message: `Turno atualizado para "${novoPeriodo.designacao}", mas nenhuma grade curricular ativa foi encontrada para atualizar o horário.`,
                turnoAtualizado: novoPeriodo.designacao,
                gradesAtualizadas: 0,
                gradesSemHorario: 0,
            };
        }

        const grades = toLowerCaseKeys(gradesResult);

        // ====================== 5. PARA CADA GRADE, BUSCAR O HORÁRIO DO NOVO TURNO E ATUALIZAR ======================
        let gradesAtualizadas = 0;
        let gradesSemHorario = 0;

        for (const grade of grades) {

            // Busca horário compatível com o novo turno para esta disciplina/classe/curso
            const horarioResult = await this.dataSource.query(
                `
                SELECT 
                    hr.pk_horario   AS pk,
                    hr.designacao   AS designacao
                FROM FK2_MGH_TB_HORARIO hr
                WHERE hr.FK_PERIODO       = :novoPeriodoCodigo
                  AND hr.FK_GRADE_CURRICULAR  = :codigo_uc
                  AND hr.FK_ANO_LECTIVO       = :anoLectivoId
                FETCH FIRST 1 ROWS ONLY
                `,
                {
                    novoPeriodoCodigo,
                    codigo_uc: grade.codigo_uc,
                    anoLectivoId,
                } as any,
            );

            const horario = horarioResult?.length ? toLowerCaseKeys(horarioResult[0]) : null;

            // Se encontrou horário, monta o JSON de referência; caso contrário, mete null
            const novoRefHorario = horario
                ? JSON.stringify({ pk: horario.pk, desc: horario.designacao })
                : null;

            await this.dataSource.query(
                `
                UPDATE FK2_TB_GRADE_CURRICULAR_ALUNO
                SET REF_HORARIO = :novoRefHorario
                WHERE CODIGO    = :codigoGradeAluno
                `,
                {
                    novoRefHorario,
                    codigoGradeAluno: grade.codigo_grade_aluno,
                } as any,
            );

            if (horario) {
                gradesAtualizadas++;
            } else {
                gradesSemHorario++;
            }
        }

        return {
            success: true,
            message: `Turno alterado para "${novoPeriodo.designacao}" com sucesso.`,
            aluno: matricula.nome_completo,
            turnoAnterior: matricula.periodo_atual,
            turnoAtualizado: novoPeriodo.designacao,
            totalGrades: grades.length,
            gradesComHorarioAtualizado: gradesAtualizadas,
            gradesSemHorarioEncontrado: gradesSemHorario,
        };
    }
}