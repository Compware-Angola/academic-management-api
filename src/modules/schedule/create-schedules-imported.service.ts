import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as oracledb from 'oracledb';
import { CreateImportSchedulesDto } from './dto/create-schedules-imported.dto';
import { escapeQuotes } from '../util/escape-quotes';

// ==================== TIPOS ====================

interface HorarioOrigemRaw {
    PKHORARIO: number;
    DESIGNACAO: string;
    REFGRADECURRICULAR: string;
    REFPERIODICIDADE: string;
    REFCURSOSPERMITIDOS: string;
    REFTURMA: string | null;
    FKGRADECURRICULAR: string;
    FKSEMESTRE: string;
    FKCURSOSPERMITIDOS: string;
    FKPERIODO: string;
    FKTURMA: string | null;
    CAPACIDADE: number;
    APENASPRIMEIROANO: number;
    FKESTADOHORARIOWF: number;
    OBS: string | null;
}

interface AulaOrigemRaw {
    FKDIASEMANA: number;
    FKTIPOAULA: number;
    FKMODALIDADE: number;
    ORDEM: number;
    HORAINICIO: string;
    HORATERMINO: string;
    REFAULA: string;
    REFSALA: string;
    REFDOCENTE: string;

    SALAID: number | null;
    OBS: string | null;
}

interface ScheduleImportResult {
    scheduleId: number;
    horarioOrigemId: number;
    horarioDestinoId: number | null;
    designacaoOrigem: string | null;
    designacaoDestino: string | null;
    status: 'inserido' | 'colisao_parcial' | 'colisao_total' | 'erro';
    diasInseridos: number[];
    diasColididos: number[];
    mensagem?: string;
}

export interface ImportSummary {
    totalProcessados: number;
    totalInseridos: number;
    totalColisaoParcial: number;
    totalColisaoTotal: number;
    totalErros: number;
    detalhes: ScheduleImportResult[];
}

@Injectable()
export class CreateSchedulesImportedService {
    constructor(private readonly dataSource: DataSource) { }

    // ==================== ORQUESTRADOR ====================

    async createSchedulesImported(
        importSchedulesDto: CreateImportSchedulesDto,
        userId: number = 1,
    ): Promise<ImportSummary> {
        const { schedulesImported, permitiColisao, fkanoLectivoDestino } = importSchedulesDto;

        const detalhes: ScheduleImportResult[] = [];

        for (const schedule of schedulesImported) {
            const { scheduleId } = schedule;

            try {
                const resultado = await this.importarHorarioUnico(
                    scheduleId,
                    fkanoLectivoDestino,
                    permitiColisao,
                    userId,
                );
                detalhes.push(resultado);
            } catch (error: any) {
                detalhes.push({
                    scheduleId,
                    horarioOrigemId: scheduleId,
                    horarioDestinoId: null,
                    designacaoOrigem: null,
                    designacaoDestino: null,
                    status: 'erro',
                    diasInseridos: [],
                    diasColididos: [],
                    mensagem: error?.message ?? 'Erro desconhecido ao importar horário',
                });
            }
        }

        return this.montarSumario(detalhes);
    }

    private montarSumario(detalhes: ScheduleImportResult[]): ImportSummary {
        return {
            totalProcessados: detalhes.length,
            totalInseridos: detalhes.filter((d) => d.status === 'inserido').length,
            totalColisaoParcial: detalhes.filter((d) => d.status === 'colisao_parcial').length,
            totalColisaoTotal: detalhes.filter((d) => d.status === 'colisao_total').length,
            totalErros: detalhes.filter((d) => d.status === 'erro').length,
            detalhes,
        };
    }

    // ==================== IMPORTAÇÃO DE UM HORÁRIO ====================

    private async importarHorarioUnico(
        scheduleId: number,
        fkanoLectivoDestino: number,
        permitiColisao: boolean,
        userId: number,
    ): Promise<ScheduleImportResult> {
        // 1. Buscar horário de origem
        const horarioOrigem = await this.buscarHorarioOrigemCompleto(scheduleId);
        if (!horarioOrigem) {
            throw new NotFoundException(`Horário de origem ${scheduleId} não encontrado`);
        }

        const aulasOrigem = await this.buscarAulasOrigem(scheduleId);
        if (aulasOrigem.length === 0) {
            return {
                scheduleId,
                horarioOrigemId: scheduleId,
                horarioDestinoId: null,
                designacaoOrigem: horarioOrigem.DESIGNACAO,
                designacaoDestino: null,
                status: 'erro',
                diasInseridos: [],
                diasColididos: [],
                mensagem: 'Horário de origem não possui aulas cadastradas',
            };
        }

        // 2. Definir a designação do horário destino (H1, H2, H3...)
        const designacaoDestino = await this.gerarDesignacaoDestino(
            horarioOrigem.FKGRADECURRICULAR,
            horarioOrigem.DESIGNACAO,
            fkanoLectivoDestino,
        );

        // 3. Agrupar aulas por dia da semana
        const aulasPorDia = this.agruparAulasPorDia(aulasOrigem);
        const diasOrigem = Object.keys(aulasPorDia).map(Number);


        //LOGS


        // 4. Verificar colisão por dia (só se permitiColisao = false)
        const diasColididos: number[] = [];
        const diasLivres: number[] = [];

        if (permitiColisao) {
            diasLivres.push(...diasOrigem);
        } else {
            for (const dia of diasOrigem) {

                const aulasDoDia = aulasPorDia[dia];

                const colidiu = await this.diaColide(aulasDoDia, fkanoLectivoDestino);
                if (colidiu) {
                    diasColididos.push(dia);
                } else {
                    diasLivres.push(dia);
                }
            }
        }

        // 5. Colisão total: nenhum dia livre -> não cria o horário
        if (!permitiColisao && diasLivres.length === 0) {
            return {
                scheduleId,
                horarioOrigemId: scheduleId,
                horarioDestinoId: null,
                designacaoOrigem: horarioOrigem.DESIGNACAO,
                designacaoDestino: null,
                status: 'colisao_total',
                diasInseridos: [],
                diasColididos,
                mensagem: 'Todos os dias da semana já estão ocupados no destino',
            };
        }

        // 6. Criar o horário destino
        const horarioDestinoId = await this.inserirHorarioDestino(
            horarioOrigem,
            fkanoLectivoDestino,
            designacaoDestino,
            userId,
        );

        // 7. Inserir as aulas dos dias livres
        for (const dia of diasLivres) {
            for (const aula of aulasPorDia[dia]) {
                await this.inserirAulaDestino(horarioDestinoId, aula, userId);
            }
        }

        const status = diasColididos.length > 0 ? 'colisao_parcial' : 'inserido';

        return {
            scheduleId,
            horarioOrigemId: scheduleId,
            horarioDestinoId,
            designacaoOrigem: horarioOrigem.DESIGNACAO,
            designacaoDestino,
            status,
            diasInseridos: diasLivres,
            diasColididos,
        };
    }

    // ==================== BUSCA DE DADOS DE ORIGEM ====================

    private async buscarHorarioOrigemCompleto(scheduleId: number): Promise<HorarioOrigemRaw | null> {
        const result = await this.dataSource.query(
            `
        SELECT
          h."PK_HORARIO"            AS "PKHORARIO",
          h."DESIGNACAO"            AS "DESIGNACAO",
          h."REF_GRADE_CURRICULAR"  AS "REFGRADECURRICULAR",
          h."REF_PERIODICIDADE"     AS "REFPERIODICIDADE",
          h."REF_CURSOS_PERMITIDOS" AS "REFCURSOSPERMITIDOS",
          h."REF_TURMA"             AS "REFTURMA",
          h."FK_GRADE_CURRICULAR"   AS "FKGRADECURRICULAR",
          h."FK_SEMESTRE"           AS "FKSEMESTRE",
          h."FK_CURSOS_PERMITIDOS"  AS "FKCURSOSPERMITIDOS",
          h."FK_PERIODO"            AS "FKPERIODO",
          h."FK_TURMA"              AS "FKTURMA",
          h."CAPACIDADE"            AS "CAPACIDADE",
          h."APENASPRIMEIROANO"     AS "APENASPRIMEIROANO",
          h."FK_ESTADO_HORARIO_WF"  AS "FKESTADOHORARIOWF",
          h."OBS"                   AS "OBS"
        FROM "FK2_MGH_TB_HORARIO" h
        WHERE h."PK_HORARIO" = :scheduleId
        `,
            { scheduleId } as any,
        );

        const rows = this.unwrapRows<HorarioOrigemRaw>(result);
        return rows.length > 0 ? rows[0] : null;
    }

    private async buscarAulasOrigem(scheduleId: number): Promise<AulaOrigemRaw[]> {
        const result = await this.dataSource.query(
            `
        SELECT
          a."FK_DIA_DA_SEMANA"                 AS "FKDIASEMANA",
          a."FK_TIPO_AULA"                      AS "FKTIPOAULA",
          a."FK_MODALIDADE"                     AS "FKMODALIDADE",
          a."ORDEM"                             AS "ORDEM",
          TO_CHAR(a."HORA_INICIO",  'HH24:MI')  AS "HORAINICIO",
          TO_CHAR(a."HORA_TERMINO", 'HH24:MI')  AS "HORATERMINO",
          a."REF_AULA"                          AS "REFAULA",
          a."REF_SALA"                          AS "REFSALA",
          a."REF_DOCENTE"                       AS "REFDOCENTE",
         
          JSON_VALUE(a."REF_SALA", '$.pk' RETURNING NUMBER) AS "SALAID",
          a."OBS"                               AS "OBS"
        FROM "FK2_MGH_TB_AULA" a
        WHERE a."FK_HORARIO" = :scheduleId
        ORDER BY a."FK_DIA_DA_SEMANA", a."ORDEM"
        `,
            { scheduleId } as any,
        );
        console.log('Aulas de origem: ROW ', JSON.stringify(result));

        return this.unwrapRows<AulaOrigemRaw>(result);
    }

    // ==================== DESIGNAÇÃO ====================

    /**
     * @description Extrai o prefixo (tudo antes do número final) e o número final da designação
     * EX: "ENGINFO.2.PROG II-H3" -> { prefixo: "ENGINFO.2.PROG II-H", numero: 3 }
     */
    private extrairPrefixoNumero(designacao: string): { prefixo: string; numero: number | null } {
        const match = designacao.match(/^(.*\D)?(\d+)$/);
        if (match && match[2]) {
            return { prefixo: match[1] ?? '', numero: Number(match[2]) };
        }
        return { prefixo: designacao, numero: null };
    }

    /**
     * @description Gera a nova designação do horário destino, com base na quantidade
     * de horários já existentes no destino para a mesma grade curricular.
     */
    private async gerarDesignacaoDestino(
        fkGradeCurricular: string,
        designacaoOrigem: string,
        fkanoLectivoDestino: number,
    ): Promise<string> {
        const { prefixo } = this.extrairPrefixoNumero(designacaoOrigem);

        const result = await this.dataSource.query(
            `
        SELECT COUNT(*) AS QTD
        FROM "FK2_MGH_TB_HORARIO"
        WHERE TO_NUMBER(NULLIF("FK_GRADE_CURRICULAR", '')) = TO_NUMBER(NULLIF(:fkGradeCurricular, ''))
          AND "FK_ANO_LECTIVO" = TO_CHAR(:fkanoLectivoDestino)
        `,
            { fkGradeCurricular, fkanoLectivoDestino } as any,
        );

        const rows = this.unwrapRows<{ QTD: number }>(result);
        const qtdExistente = Number(rows[0]?.QTD ?? 0);

        const novoNumero = qtdExistente + 1;
        return `${prefixo}${novoNumero}`;
    }

    // ==================== AGRUPAMENTO POR DIA ====================

    private agruparAulasPorDia(aulas: AulaOrigemRaw[]): Record<number, AulaOrigemRaw[]> {
        const agrupado: Record<number, AulaOrigemRaw[]> = {};
        for (const aula of aulas) {
            const dia = Number(aula.FKDIASEMANA);
            if (!agrupado[dia]) agrupado[dia] = [];
            agrupado[dia].push(aula);
        }
        console.log('Aulas por dia: ', JSON.stringify(agrupado));
        console.log('Dias de origem: ', Object.keys(agrupado).map(Number));
        return agrupado;
    }

    // ==================== VERIFICAÇÃO DE COLISÃO ====================

    /**
     * @description Verifica se algum horário/dia já registrado no destino colide
     * (sobreposição de horário) com as aulas do dia sendo importado.
     * Critério: mesma TURMA ou mesma SALA já ocupada no mesmo dia da semana,
     * com intervalo de horário sobreposto, dentro do ano lectivo destino.
     * AJUSTAR conforme critério real de colisão (turma / sala / docente).
     */
    private async diaColide(aulasDoDia: AulaOrigemRaw[], fkanoLectivoDestino: number): Promise<boolean> {
        for (const aula of aulasDoDia) {
            console.log('Aula222: ', JSON.stringify(aula));

            const salaId = aula.SALAID ? Number(aula.SALAID) : null;

            const result = await this.dataSource.query(
                `
            SELECT COUNT(*) AS QTD
            FROM "FK2_MGH_TB_AULA" a
            INNER JOIN "FK2_MGH_TB_HORARIO" h
              ON h."PK_HORARIO" = a."FK_HORARIO"
            WHERE h."FK_ANO_LECTIVO" = TO_CHAR(:fkanoLectivoDestino)
              AND a."FK_DIA_DA_SEMANA" = :diaSemana
              AND a."ACTIVE_STATE" = 1
              AND (
                    (:salaId IS NOT NULL AND JSON_VALUE(a."REF_SALA", '$.pk' RETURNING NUMBER) = :salaId)
                 
              )
              AND TO_DATE(:horaInicio, 'HH24:MI') < a."HORA_TERMINO"
              AND TO_DATE(:horaFim,    'HH24:MI') > a."HORA_INICIO"
            `,
                {
                    fkanoLectivoDestino,
                    diaSemana: aula.FKDIASEMANA,
                    salaId,

                    horaInicio: aula.HORAINICIO,
                    horaFim: aula.HORATERMINO,
                } as any,
            );
            console.log('Result: ', JSON.stringify(result));


            const rows = this.unwrapRows<{ QTD: number }>(result);
            if (Number(rows[0]?.QTD ?? 0) > 0) {
                return true; // basta uma aula colidir para o dia ser considerado colidido
            }
        }

        return false;
    }

    // ==================== INSERÇÃO NO DESTINO ====================

    private async inserirHorarioDestino(
        horarioOrigem: HorarioOrigemRaw,
        fkanoLectivoDestino: number,
        designacaoDestino: string,
        userId: number,
    ): Promise<number> {
        const descAnoLectivoDestino = await this.getDescricaoAnoLectivo(fkanoLectivoDestino);
        const refAnoLectivoDestino = `{"pk":${fkanoLectivoDestino},"desc":"${escapeQuotes(descAnoLectivoDestino)}","corLetra":"black"}`;

        const result = await this.dataSource.query(
            `
        INSERT INTO fk2_mgh_tb_horario (
            DESIGNACAO,
            REF_GRADE_CURRICULAR,
            REF_PERIODICIDADE,
            REF_ANO_LECTIVO,
            REF_CURSOS_PERMITIDOS,
            REF_TURMA,
            FK_ESTADO_HORARIO_WF,
            OBS,
            CREATED_BY,
            LAST_UPDATED_BY,
            CREATED_AT,
            UPDATED_AT,
            ACTIVE_STATE,
            CAPACIDADE,
            APENASPRIMEIROANO,
            DIPONIVEL,
            HORARIO_REUTILIZADO,
            FK_GRADE_CURRICULAR,
            FK_SEMESTRE,
            FK_ANO_LECTIVO,
            FK_CURSOS_PERMITIDOS,
            FK_PERIODO,
            FK_TURMA
        ) VALUES (
            :designacao,
            :refGrade,
            :refPeriodo,
            :refAnoLectivo,
            :refCursos,
            :refTurma,
            :estadoHorario,
            :obs,
            :userId,
            :userId,
            SYSDATE,
            SYSDATE,
            1,
            :capacidade,
            :apenasPrimeiroAno,
            1,
            1,                       -- HORARIO_REUTILIZADO = 1 (veio de importação)
            :fkGradeCurricular,
            :fkSemestre,
            TO_CHAR(:fkanoLectivoDestino),
            :fkCursosPermitidos,
            :fkPeriodo,
            :fkTurma
        ) RETURNING PK_HORARIO INTO :outId
        `,
            {
                designacao: designacaoDestino,
                refGrade: horarioOrigem.REFGRADECURRICULAR,
                refPeriodo: horarioOrigem.REFPERIODICIDADE,
                refAnoLectivo: refAnoLectivoDestino,
                refCursos: horarioOrigem.REFCURSOSPERMITIDOS,
                refTurma: horarioOrigem.REFTURMA,
                estadoHorario: horarioOrigem.FKESTADOHORARIOWF ?? 2,
                obs: horarioOrigem.OBS,
                userId,
                capacidade: horarioOrigem.CAPACIDADE,
                apenasPrimeiroAno: horarioOrigem.APENASPRIMEIROANO,
                fkGradeCurricular: horarioOrigem.FKGRADECURRICULAR,
                fkSemestre: horarioOrigem.FKSEMESTRE,
                fkanoLectivoDestino,
                fkCursosPermitidos: horarioOrigem.FKCURSOSPERMITIDOS,
                fkPeriodo: horarioOrigem.FKPERIODO,
                fkTurma: horarioOrigem.FKTURMA,
                outId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            } as any,
        );

        return result.outId[0];
    }

    private async inserirAulaDestino(horarioDestinoId: number, aula: AulaOrigemRaw, userId: number): Promise<void> {
        try {
            await this.dataSource.query(
                `
            INSERT INTO FK2_MGH_TB_AULA (
                FK_HORARIO,
                FK_DIA_DA_SEMANA,
                FK_TIPO_AULA,
                FK_MODALIDADE,
                ORDEM,
                HORA_INICIO,
                HORA_TERMINO,
                REF_AULA,
                REF_SALA,
                REF_DOCENTE,
                REF_TURMAS_PARTICIPANTES,
                OBS,
                CREATED_BY,
                LAST_UPDATED_BY,
                CREATED_AT,
                UPDATED_AT,
                ACTIVE_STATE
            ) VALUES (
                :horarioId,
                :diaSemana,
                :fkTipoAula,
                :fkModalidade,
                :ordem,
                TO_DATE(:horaInicio, 'HH24:MI'),
                TO_DATE(:horaFim, 'HH24:MI'),
                :refAula,
                :refSala,
                :refDocente,
                :refTurmas,
                :obs,
                :userId,
                :userId,
                SYSDATE,
                SYSDATE,
                1
            )
            `,
                {
                    horarioId: horarioDestinoId,
                    diaSemana: aula.FKDIASEMANA,
                    fkTipoAula: aula.FKTIPOAULA,
                    fkModalidade: aula.FKMODALIDADE,
                    ordem: aula.ORDEM ?? 1,
                    horaInicio: aula.HORAINICIO,
                    horaFim: aula.HORATERMINO,
                    refAula: aula.REFAULA,
                    refSala: aula.REFSALA,
                    refDocente: aula.REFDOCENTE,
                    refTurmas: null,
                    obs: aula.OBS,
                    userId,
                } as any,
            );
        } catch (error: any) {
            // Mantive silencioso como no seu código original (createOrUpdateHorario),
            // mas recomendo logar aqui para não perder falhas silenciosas em produção.
            console.error(`Erro ao inserir aula do horário ${horarioDestinoId}:`, error?.message);
        }
    }

    // ==================== HELPERS ====================

    private unwrapRows<T>(result: any): T[] {
        if (!result) return [];
        if (Array.isArray(result) && Array.isArray(result[0])) {
            return result[0];
        }
        return Array.isArray(result) ? result : [result];
    }

    // Pressupondo que este método já existe na classe (usado em createOrUpdateHorario)
    private async getDescricaoAnoLectivo(anoLectivo: number): Promise<string> {
        const result = await this.dataSource.query(
            `SELECT DESIGNACAO FROM FK2_TB_ANO_LECTIVO WHERE CODIGO = :anoLectivo`,
            { anoLectivo } as any,
        );
        const rows = this.unwrapRows<{ DESIGNACAO: string }>(result);
        return rows[0]?.DESIGNACAO ?? String(anoLectivo);
    }
}