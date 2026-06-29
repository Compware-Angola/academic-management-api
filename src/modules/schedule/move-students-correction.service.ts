import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { escapeQuotes } from "../util/escape-quotes";

import { DataSource } from "typeorm";
import { DecodedUserPayload } from "../../common/types/token-validation-response.interface";
import { MoveStudentsToScheduleCorrectionDto } from "./dto/move-students-to-schedule-correction.dto copy";
import { Injectable } from "@nestjs/common";

@Injectable()
export class MoveStudentsCorrectionService {
    constructor(
        private dataSource: DataSource,

    ) { }

    async moveStudentToScheduleCorrection(dto: MoveStudentsToScheduleCorrectionDto, user: DecodedUserPayload) {
        const { toScheduleId, studentsCurriculumIds } = dto;


        const to = await this.getschedule(toScheduleId);
        if (!to || to.length === 0) {
            throw new NotFoundException(
                `Horário ${toScheduleId} de Destino não encontrado ou inativo`,
            );
        }

        if (to[0].TOTAL_ALUNOS + studentsCurriculumIds.length > to[0].CAPACIDADE) {
            throw new BadRequestException(
                `Com Este número de estudantes selecionado, vas exceder a capacidade suportado. Atual: ${to[0].TOTAL_ALUNOS} Previsão Com os novos : ${to[0].CAPACIDADE + studentsCurriculumIds.length}`,
            );
        }


        const json_schedule = `{"pk":${to[0].CODIGO},"desc":"${escapeQuotes(to[0].DESIGNACAO)}", "corLetra": "black", "disponivel": true}`;
        const json_user = `{"pk": ${user.sub}, "desc": ${escapeQuotes(user?.username || '')}, "corLetra": "black", "disponivel": true}`;

        if (studentsCurriculumIds.length === 0) return;
        const validIdsResult = await this.dataSource.query(`
  SELECT "CODIGO"
  FROM "FK2_TB_GRADE_CURRICULAR_ALUNO"
  WHERE "CODIGO" IN (${studentsCurriculumIds.join(',')})
`);

        const validIds = validIdsResult.map((row: any) => row.CODIGO);

        if (validIds.length === 0) {
            console.warn('Nenhum aluno válido encontrado para atualizar o horário.');
            throw new NotFoundException(
                `Nenhum aluno válido encontrado para atualizar o horário`,
            );
        }

        console.log(`Atualizando horário de ${validIds.length} aluno(s)`);

        const codigo_grade_curricular = to[0].CODIGO_GRADE_CURRICULAR;

        await this.dataSource.query(
            `
  UPDATE "FK2_TB_GRADE_CURRICULAR_ALUNO"
  SET
    "REF_HORARIO" = :json_schedule,
    "USER_ID"=:userId,
    "CODIGO_GRADE_CURRICULAR"=:codigo_grade_curricular,
    "CODIGO_UTILIZADOR" =:utilizador,
    "REF_UTILIZADOR"=:json_user,
    "UPDATED_AT" = SYSDATE
  WHERE "CODIGO" IN (${validIds.join(',')})
`,
            { json_schedule, userId: user.sub, codigo_grade_curricular, utilizador: user.sub, json_user } as any,
        );

        return {
            success: true,
            message: `${studentsCurriculumIds.length} Estudante(s) Movimentados com sucesso`,
        };
    }
    private async getschedule(cheduleId: number): Promise<any> {
        return await this.dataSource.query(
            `
    SELECT DISTINCT
      h."PK_HORARIO"                                            AS "CODIGO",
      h."DESIGNACAO"                                            AS "DESIGNACAO",
      h."CAPACIDADE"                                            AS "CAPACIDADE",
    NVL(alu."TOTAL_ALUNOS", 0)                                AS "TOTAL_ALUNOS",
   g."CODIGO" AS "CODIGO_GRADE_CURRICULAR"
    FROM "FK2_MGH_TB_HORARIO" h
   INNER JOIN "FK2_TB_GRADE_CURRICULAR" g
    ON TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", '')) = g."CODIGO"
  LEFT JOIN (
    SELECT
        "CODIGO_GRADE_CURRICULAR",
        JSON_VALUE("REF_HORARIO", '$.pk' RETURNING NUMBER) AS "HORARIO_ID",
        COUNT(*) AS "TOTAL_ALUNOS"
    FROM "FK2_TB_GRADE_CURRICULAR_ALUNO"
     GROUP BY
        "CODIGO_GRADE_CURRICULAR",
        JSON_VALUE("REF_HORARIO", '$.pk' RETURNING NUMBER)
) alu
    ON alu."CODIGO_GRADE_CURRICULAR" = g."CODIGO"
   AND alu."HORARIO_ID" = h."PK_HORARIO"
    WHERE h."PK_HORARIO" = :cheduleId

  `,
            [cheduleId],
        );
    }
}