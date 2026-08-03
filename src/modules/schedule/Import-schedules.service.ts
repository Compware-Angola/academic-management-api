import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ImportSchedulesDto } from './dto/Import-schedules.dto';

// Mapa de ID do dia da semana -> chave usada na resposta
// AJUSTAR conforme os valores reais de FK2_MGH_TB_DIA_DA_SEMANA
const DIA_SEMANA_MAP: Record<number, string> = {
    1: 'domingo',
    2: 'segunda',
    3: 'terca',
    4: 'quarta',
    5: 'quinta',
    6: 'sexta',
    7: 'sabado',
};

interface DisciplinaGrade {
    CODIGOGRADE: number;
    CODIGODISCIPLINA: number;
    NOMEDISCIPLINA: string;
    SIGLA: string;
}

interface HorarioRow {
    HORARIOID: number;
    DESIGNACAO: string;
}

interface AulaRow {
    HORARIOID: number;
    DIASEMANAID: number;
    HORAINICIO: string;
    HORATERMINO: string;
}

interface HorarioMontado {
    horarioId: number;
    designacao: string;
    aulas: Record<string, { tempos: { horaInicio: string; horaTermino: string }[] }>;
}

export interface DisciplinaResultado {
    gradeCurricularId: number;
    disciplina: string;
    disciplinaId: number;
    encontrado: boolean;
    mensagem?: string;
    horarios: HorarioMontado[];
}

@Injectable()
export class ImportSchedulesService {
    constructor(private readonly dataSource: DataSource) { }

    public async getSchedulesToImport(importSchedulesDto: ImportSchedulesDto): Promise<DisciplinaResultado[]> {
        const { fkanoLectivoOrigem, fkanoLectivoDestino, fkCurso, fkClasse, fksemestre, fkperiodo } = importSchedulesDto;

        // 1. Verificar se já existe o plano de estudo do curso no ano destino
        await this.getPlanoCurso(fkCurso, fkanoLectivoDestino);

        // 2. Buscar a grade curricular do curso/classe/semestre, vinculada ao plano do ano destino
        const grades = await this.getGradeCurricular(fkCurso, fksemestre, fkClasse, fkanoLectivoDestino);

        if (!grades || grades.length === 0) {
            throw new NotFoundException(
                `Grade curricular não encontrada para curso ${fkCurso}, classe ${fkClasse}, semestre ${fksemestre}.`,
            );
        }

        const resultado: DisciplinaResultado[] = [];

        // 3. Para cada disciplina da grade, buscar os horários (com fallback em cascata)
        for (const grade of grades) {
            let horarios = await this.getHorarios(grade.CODIGOGRADE, fkperiodo, fkanoLectivoOrigem);

            if (!horarios || horarios.length === 0) {
                horarios = await this.getHorariosbyDisciplinaId(
                    grade.CODIGODISCIPLINA,
                    fkperiodo,
                    fkanoLectivoOrigem,
                );
            }

            if (!horarios || horarios.length === 0) {
                horarios = await this.getHorariosbyDisciplinaNome(
                    grade.NOMEDISCIPLINA,
                    grade.SIGLA,
                    fkperiodo,
                    fkanoLectivoOrigem,
                );
            }

            // Não encontrou horário em nenhuma das tentativas -> entra no resultado com mensagem
            if (!horarios || horarios.length === 0) {
                resultado.push({
                    gradeCurricularId: Number(grade.CODIGOGRADE),
                    disciplina: grade.NOMEDISCIPLINA,
                    disciplinaId: Number(grade.CODIGODISCIPLINA),
                    encontrado: false,
                    mensagem: `Nenhum horário encontrado para a disciplina "${grade.NOMEDISCIPLINA}" no ano lectivo de origem informado.`,
                    horarios: [],
                });
                continue;
            }

            // 4. Montar a estrutura de horários + aulas agrupadas por dia da semana
            const horariosMontados: HorarioMontado[] = [];
            for (const horario of horarios) {
                const aulas = await this.getAulasByHorario(horario.HORARIOID);
                horariosMontados.push({
                    horarioId: Number(horario.HORARIOID),
                    designacao: horario.DESIGNACAO,
                    aulas: this.montarAulasPorDia(aulas),
                });
            }

            resultado.push({
                gradeCurricularId: Number(grade.CODIGOGRADE),
                disciplina: grade.NOMEDISCIPLINA,
                disciplinaId: Number(grade.CODIGODISCIPLINA),
                encontrado: true,
                horarios: horariosMontados,
            });
        }

        return resultado;
    }

    /**
     * @description Verifica se ja Existe o plano de estudo de um curso
     * @param codigoCurso 
     * @param codigoAnoLectivo 
     * @returns codigo do plano de estudo
     */
    private async getPlanoCurso(
        codigoCurso: number,
        codigoAnoLectivo: number,
    ): Promise<number> {
        const result = await this.dataSource.query(
            `
        SELECT CODIGO
        FROM FK2_TB_PLANO_CURRICULAR_CURSO
        WHERE CODIGO_CURSO       = :codigoCurso
          AND CODIGO_ANO_LECTIVO = :codigoAnoLectivo
        FETCH FIRST 1 ROWS ONLY
        `,
            { codigoCurso, codigoAnoLectivo } as any,
        );

        if (!result || result.length === 0) {
            throw new NotFoundException(
                `Plano do curso não encontrado para o curso ${codigoCurso} e ano lectivo ${codigoAnoLectivo}.`,
            );
        }

        return Number(result[0].CODIGO);
    }

    /**
     * @description Busca as disciplinas da grade curricular do curso, 
     * garantindo que a grade pertence ao plano curricular do curso no ano lectivo informado
     */
    private async getGradeCurricular(
        fkCurso: number,
        fksemestre: number,
        fkClasse: number,
        codigoAnoLectivo: number,
    ): Promise<DisciplinaGrade[]> {
        const result = await this.dataSource.query(
            `
    SELECT
      g."CODIGO"           AS "CODIGOGRADE",
      d."CODIGO"            AS "CODIGODISCIPLINA",
      d."DESIGNACAO"        AS "NOMEDISCIPLINA",
      d."NOME_ABREVIATURA"  AS "SIGLA"
    FROM "FK2_TB_GRADE_CURRICULAR" g
    INNER JOIN "FK2_TB_PLANO_CURRICULAR_GRADE" pg
      ON pg."CODIGO_GRADE_CURRICULAR" = g."CODIGO"
    INNER JOIN "FK2_TB_PLANO_CURRICULAR_CURSO" pgc
      ON pgc."CODIGO" = pg."CODIGO_PLANO_CURRICULAR_CURSO"
    INNER JOIN "FK2_TB_DISCIPLINAS" d
      ON d."CODIGO" = g."CODIGO_DISCIPLINA"
    WHERE g."CODIGO_CURSO"       = :fkCurso
      AND g."CODIGO_CLASSE"      = :fkClasse
      AND g."CODIGO_SEMESTRE"    = :fksemestre
      AND pgc."CODIGO_ANO_LECTIVO" = :codigoAnoLectivo
      AND g."STATUS_"            = 1
      AND d."STATUS_"            = 1
    `,
            { fkCurso, fkClasse, fksemestre, codigoAnoLectivo } as any,
        );

        return this.unwrapRows(result);
    }

    /**
     * @description Busca horários pelo código da grade curricular
     */
    private async getHorarios(
        codigoGrade: number,
        fkperiodo: number,
        fkanoLectivo: number,
    ): Promise<HorarioRow[]> {
        const result = await this.dataSource.query(
            `
        SELECT
          h."PK_HORARIO"  AS "HORARIOID",
          h."DESIGNACAO"  AS "DESIGNACAO"
        FROM "FK2_MGH_TB_HORARIO" h
        WHERE TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", '')) = :codigoGrade
          AND h."FK_PERIODO"     = :fkperiodo
          AND h."FK_ANO_LECTIVO" = :fkanoLectivo
        ORDER BY h."PK_HORARIO" ASC
        `,
            { codigoGrade, fkperiodo, fkanoLectivo } as any,
        );

        return this.unwrapRows(result);
    }

    /**
     * @description Fallback: busca horários pelo código da disciplina, via grade curricular
     */
    private async getHorariosbyDisciplinaId(
        codigoDisciplina: number,
        fkperiodo: number,
        fkanoLectivo: number,
    ): Promise<HorarioRow[]> {
        const result = await this.dataSource.query(
            `
        SELECT
          h."PK_HORARIO"  AS "HORARIOID",
          h."DESIGNACAO"  AS "DESIGNACAO"
        FROM "FK2_MGH_TB_HORARIO" h
        INNER JOIN "FK2_TB_GRADE_CURRICULAR" g
          ON TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", '')) = g."CODIGO"
        WHERE g."CODIGO_DISCIPLINA" = :codigoDisciplina
          AND h."FK_PERIODO"        = :fkperiodo
          AND h."FK_ANO_LECTIVO"    = :fkanoLectivo
        ORDER BY h."PK_HORARIO" ASC
        `,
            { codigoDisciplina, fkperiodo, fkanoLectivo } as any,
        );

        return this.unwrapRows(result);
    }

    /**
     * @description Fallback final: busca horários pelo nome (ou sigla) da disciplina, ignorando acentos/maiúsculas
     */
    private async getHorariosbyDisciplinaNome(
        nomeDisciplina: string,
        siglaDisciplina: string,
        fkperiodo: number,
        fkanoLectivo: number,
    ): Promise<HorarioRow[]> {
        const result = await this.dataSource.query(
            `
        SELECT
          h."PK_HORARIO"  AS "HORARIOID",
          h."DESIGNACAO"  AS "DESIGNACAO"
        FROM "FK2_MGH_TB_HORARIO" h
        INNER JOIN "FK2_TB_GRADE_CURRICULAR" g
          ON TO_NUMBER(NULLIF(h."FK_GRADE_CURRICULAR", '')) = g."CODIGO"
        INNER JOIN "FK2_TB_DISCIPLINAS" d
          ON d."CODIGO" = g."CODIGO_DISCIPLINA"
        WHERE h."FK_PERIODO"     = :fkperiodo
          AND h."FK_ANO_LECTIVO" = :fkanoLectivo
          AND (
                TRIM(d."NOME_ABREVIATURA") = TRIM(:siglaDisciplina)
             OR FN_REMOVE_ACENTOS(UPPER(TRIM(d."DESIGNACAO"))) = FN_REMOVE_ACENTOS(UPPER(TRIM(:nomeDisciplina)))
          )
        ORDER BY h."PK_HORARIO" ASC
        `,
            { fkperiodo, fkanoLectivo, siglaDisciplina, nomeDisciplina } as any,
        );

        return this.unwrapRows(result);
    }

    /**
     * @description Busca as aulas (tempos) de um horário específico
     */
    private async getAulasByHorario(horarioId: number): Promise<AulaRow[]> {
        const result = await this.dataSource.query(
            `
        SELECT
          a."FK_HORARIO"                       AS "HORARIOID",
          a."FK_DIA_DA_SEMANA"                 AS "DIASEMANAID",
          TO_CHAR(a."HORA_INICIO",  'HH24:MI') AS "HORAINICIO",
          TO_CHAR(a."HORA_TERMINO", 'HH24:MI') AS "HORATERMINO"
        FROM "FK2_MGH_TB_AULA" a
        WHERE a."FK_HORARIO" = :horarioId
        ORDER BY a."FK_DIA_DA_SEMANA", a."ORDEM"
        `,
            { horarioId } as any,
        );

        return this.unwrapRows(result);
    }

    /**
     * @description Agrupa a lista de aulas por dia da semana, no formato esperado pelo front
     */
    private montarAulasPorDia(
        aulas: AulaRow[],
    ): Record<string, { tempos: { horaInicio: string; horaTermino: string }[] }> {
        const base: Record<string, { tempos: { horaInicio: string; horaTermino: string }[] }> = {
            segunda: { tempos: [] },
            terca: { tempos: [] },
            quarta: { tempos: [] },
            quinta: { tempos: [] },
            sexta: { tempos: [] },
            sabado: { tempos: [] },
            domingo: { tempos: [] },
        };

        for (const aula of aulas) {
            const chaveDia = DIA_SEMANA_MAP[Number(aula.DIASEMANAID)];
            if (!chaveDia) continue;

            base[chaveDia].tempos.push({
                horaInicio: aula.HORAINICIO,
                horaTermino: aula.HORATERMINO,
            });
        }

        return base;
    }

    /**
     * @description Normaliza o retorno do dataSource.query (que pode vir como array de arrays em alguns drivers)
     */
    private unwrapRows<T>(result: any): T[] {
        if (!result) return [];
        if (Array.isArray(result) && Array.isArray(result[0])) {
            return result[0];
        }
        return Array.isArray(result) ? result : [result];
    }
}