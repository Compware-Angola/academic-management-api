import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UpdateScheduleParamDto } from './dto/update-schedule-params.dto';

// ─── DTOs / Interfaces ────────────────────────────────────────────────────────

export interface DiaSemana {
    pkDiaDaSemana: number;
    designacao: string;
    ordem: number;
}

export interface Tempo {
    ordem: number;
    horaInicio: string;
    horaFim: string;
    disponivel: boolean;
}

export interface DiaComTempos {
    diaSemana: DiaSemana;
    tempos: Tempo[];
}

export interface TemposDisponiveisResult {
    items: DiaComTempos[];
    count: number;
}

// ─── Interfaces internas (parâmetros do banco) ────────────────────────────────

interface IppParam {
    periodo: number | string;
    hora_inicio: string;
    qtd_de_tempo: number | string;
}

interface DtlParam {
    curso: number | string;
    duracao: string;
}

interface IetlParam {
    curso: number | string;
    seq: { duracao: string }[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ClassTimesScheduleService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }

    // ── Ponto de entrada público ───────────────────────────────────────────────

    async getAvailableTimes(
        anoLectivo: number,
        periodo: number,
        diaSemana?: number,
    ): Promise<TemposDisponiveisResult> {
        const { horaInicio, qtdTempo, horaInicioSabado, qtdTempoSabado } =
            await this.fetchIppParams(periodo);

        const { duracaoMinutos } = await this.fetchDtlParams();
        const { intervaloMinutos } = await this.fetchIetlParams();

        const dias = await this.fetchDiasDaSemana(diaSemana);

        const items: DiaComTempos[] = dias.map((dia) => {
            const ordemDia = Number(dia.ordem ?? dia.ORDEM);
            const isWeekend = ordemDia === 7;
            const horaBase = isWeekend ? horaInicioSabado : horaInicio;
            const qtdMax = isWeekend ? qtdTempoSabado : qtdTempo;

            return {
                diaSemana: {
                    pkDiaDaSemana: Number(dia.pk_dia_da_semana ?? dia.PK_DIA_DA_SEMANA),
                    designacao: String(dia.designacao ?? dia.DESIGNACAO),
                    ordem: ordemDia,
                },
                tempos: this.generateTempos(horaBase, qtdMax, duracaoMinutos, intervaloMinutos),
            };
        });

        return { items, count: items.length };
    }

    // ── Geração dos tempos (lógica pura, sem I/O) ──────────────────────────────

    private generateTempos(
        horaBase: string,
        qtd: number,
        duracaoMin: number,
        intervaloMin: number,
    ): Tempo[] {
        const qtdNum = Number(qtd);
        const [h, m] = String(horaBase).split(':').map(Number);
        const baseDate = new Date(1970, 0, 1, h, m);

        return Array.from({ length: qtdNum }, (_, i) => {
            const offsetMin = i * (duracaoMin + intervaloMin);
            const inicio = new Date(baseDate.getTime() + offsetMin * 60_000);
            const fim = new Date(inicio.getTime() + duracaoMin * 60_000);

            return {
                ordem: i + 1,
                horaInicio: this.formatTime(inicio),
                horaFim: this.formatTime(fim),
                disponivel: true,
            };
        });
    }

    private formatTime(date: Date): string {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    private timeToMinutes(time: string): number {
        const [h, m] = String(time).split(':').map(Number);
        return h * 60 + m;
    }

    // ── Helper: buscar e parsear parâmetro ────────────────────────────────────

    private async fetchParam<T>(sigla: string): Promise<T[]> {
        const rows = await this.dataSource.query(
            `SELECT args FROM fk2_mgh_tb_parametro WHERE sigla = :sigla`,
            [sigla],
        );

        if (!rows.length) {
            throw new NotFoundException(`Parâmetro '${sigla}' não encontrado.`);
        }

        const raw: string = rows[0].ARGS ?? rows[0].args;

        if (!raw) {
            throw new NotFoundException(
                `Parâmetro '${sigla}' existe mas o campo 'args' está vazio.`,
            );
        }

        try {
            return JSON.parse(raw) as T[];
        } catch {
            throw new NotFoundException(
                `Parâmetro '${sigla}' tem JSON inválido: ${raw}`,
            );
        }
    }

    // ── Fetch: dias da semana ──────────────────────────────────────────────────

    private async fetchDiasDaSemana(diaSemana?: number): Promise<any[]> {
        const query = `
      SELECT pk_dia_da_semana, designacao, ordem
      FROM fk2_mgh_tb_dia_da_semana
      WHERE (:diaSemana IS NULL OR pk_dia_da_semana = :diaSemana)
        AND ordem <= 7
        AND ordem != 1
      ORDER BY ordem
    `;

        return this.dataSource.query(query, [diaSemana ?? null, diaSemana ?? null]);
    }

    // ── Fetch: parâmetro IPP ───────────────────────────────────────────────────

    private async fetchIppParams(periodo: number) {
        const params = await this.fetchParam<IppParam>('ipp');

        const main = params.find((p) => Number(p.periodo) === Number(periodo));
        if (!main) {
            throw new NotFoundException(`IPP não encontrado para período ${periodo}.`);
        }

        const sabado = params.find((p) => Number(p.periodo) === 0);

        return {
            horaInicio: String(main.hora_inicio).trim(),
            qtdTempo: Number(main.qtd_de_tempo),
            horaInicioSabado: String(sabado?.hora_inicio ?? main.hora_inicio).trim(),
            qtdTempoSabado: Number(sabado?.qtd_de_tempo ?? main.qtd_de_tempo),
        };
    }

    // ── Fetch: parâmetro DTL ───────────────────────────────────────────────────

    private async fetchDtlParams() {
        const params = await this.fetchParam<DtlParam>('dtl');

        const entry = params.find((p) => Number(p.curso) === 0);
        if (!entry) {
            throw new NotFoundException('DTL não encontrado para curso 0.');
        }

        return { duracaoMinutos: this.timeToMinutes(entry.duracao) };
    }

    // ── Fetch: parâmetro IETL ─────────────────────────────────────────────────

    private async fetchIetlParams() {
        const params = await this.fetchParam<IetlParam>('ietl');

        const entry = params.find((p) => Number(p.curso) === 0);
        const duracao = entry?.seq?.[0]?.duracao ?? '00:10';

        return { intervaloMinutos: this.timeToMinutes(duracao) };
    }

    // ── Update: parâmetro de horário ──────────────────────────────────────────

    async updateScheduleParam(dto: UpdateScheduleParamDto, last_updated_by: number) {
        const {
            pk_parametro,
            designacao,
            descricao,
            sigla,
            args,
            obs,
            ordem,
            active_state,
        } = dto;

        // 1. Verifica se existe
        const existing = await this.dataSource.query(
            `SELECT PK_PARAMETRO FROM FK2_MGH_TB_PARAMETRO WHERE PK_PARAMETRO = :1`,
            [pk_parametro],
        );

        if (!existing?.length) {
            throw new NotFoundException(`Parâmetro com PK ${pk_parametro} não encontrado.`);
        }

        // 2. Serializa args — valida JSON e estrutura antes de persistir
        let argsSerialized: string | undefined;
        if (args !== undefined) {
            let parsed: unknown;

            if (typeof args === 'string') {
                try {
                    parsed = JSON.parse(args);
                    argsSerialized = args;
                } catch {
                    throw new BadRequestException(`O campo 'args' contém JSON inválido.`);
                }
            } else {
                parsed = args;
                argsSerialized = JSON.stringify(args);
            }

            // Valida estrutura se for um parâmetro crítico conhecido
            const siglaAlvo = (sigla ?? '').toLowerCase();
            if (['ipp', 'dtl', 'ietl'].includes(siglaAlvo)) {
                this.validateArgsStructure(siglaAlvo, parsed);
            }
        }

        // 3. Monta SET dinâmico — só campos enviados no DTO
        const setClauses: string[] = ['UPDATED_AT = SYSDATE'];
        const bindValues: unknown[] = [];
        let bindIndex = 1;

        const addClause = (column: string, value: unknown) => {
            setClauses.push(`${column} = :${bindIndex}`);
            bindValues.push(value);
            bindIndex++;
        };

        if (designacao !== undefined) addClause('DESIGNACAO', designacao);
        if (descricao !== undefined) addClause('DESCRICAO', descricao);
        if (sigla !== undefined) addClause('SIGLA', sigla);
        if (argsSerialized !== undefined) addClause('ARGS', argsSerialized);
        if (obs !== undefined) addClause('OBS', obs);
        if (ordem !== undefined) addClause('ORDEM', ordem);
        if (active_state !== undefined) addClause('ACTIVE_STATE', active_state);
        if (last_updated_by !== undefined) addClause('LAST_UPDATED_BY', last_updated_by);

        // Nada para atualizar além do UPDATED_AT — rejeita logo
        if (setClauses.length === 1) {
            throw new BadRequestException('Nenhum campo foi enviado para atualização.');
        }

        // 4. Executa UPDATE — pk no final como positional bind
        bindValues.push(pk_parametro);

        await this.dataSource.query(
            `UPDATE FK2_MGH_TB_PARAMETRO SET ${setClauses.join(', ')} WHERE PK_PARAMETRO = :${bindIndex}`,
            bindValues,
        );

        // 5. Devolve o registo atualizado
        const rows = await this.dataSource.query(
            `SELECT PK_PARAMETRO, DESIGNACAO, DESCRICAO, SIGLA, ARGS, OBS, ORDEM, ACTIVE_STATE
     FROM FK2_MGH_TB_PARAMETRO
     WHERE PK_PARAMETRO = :1`,
            [pk_parametro],
        );

        const row = rows[0];

        // Tenta parsear ARGS de volta para objeto na resposta
        let parsedArgs: unknown = row.ARGS ?? row.args;
        try {
            if (parsedArgs) parsedArgs = JSON.parse(parsedArgs as string);
        } catch {
            // mantém como string se não for JSON válido
        }

        return {
            success: true,
            message: 'Parâmetro atualizado com sucesso.',
            data: {
                pkParametro: Number(row.PK_PARAMETRO ?? row.pk_parametro),
                designacao: String(row.DESIGNACAO ?? row.designacao),
                descricao: String(row.DESCRICAO ?? row.descricao),
                sigla: String(row.SIGLA ?? row.sigla),
                args: parsedArgs,
                obs: row.OBS ?? row.obs,
                ordem: Number(row.ORDEM ?? row.ordem),
                activeState: Number(row.ACTIVE_STATE ?? row.active_state),
            },
        };
    }

    // ── Validação de estrutura dos parâmetros críticos ────────────────────────

    private validateArgsStructure(sigla: string, args: unknown): void {
        if (!Array.isArray(args)) {
            throw new BadRequestException(
                `O campo 'args' do parâmetro '${sigla}' deve ser um array.`,
            );
        }

        if (sigla === 'ipp') {
            for (const item of args) {
                if (typeof item.periodo === 'undefined' || !item.hora_inicio || !item.qtd_de_tempo) {
                    throw new BadRequestException(
                        `IPP: cada entrada deve ter 'periodo', 'hora_inicio' e 'qtd_de_tempo'. Entrada inválida: ${JSON.stringify(item)}`,
                    );
                }
                if (!/^\d{2}:\d{2}$/.test(String(item.hora_inicio))) {
                    throw new BadRequestException(
                        `IPP: 'hora_inicio' deve estar no formato HH:MM. Recebido: '${item.hora_inicio}'`,
                    );
                }
                if (isNaN(Number(item.qtd_de_tempo)) || Number(item.qtd_de_tempo) <= 0) {
                    throw new BadRequestException(
                        `IPP: 'qtd_de_tempo' deve ser um número positivo. Recebido: '${item.qtd_de_tempo}'`,
                    );
                }
            }
        }

        if (sigla === 'dtl') {
            for (const item of args) {
                if (typeof item.curso === 'undefined' || !item.duracao) {
                    throw new BadRequestException(
                        `DTL: cada entrada deve ter 'curso' e 'duracao'. Entrada inválida: ${JSON.stringify(item)}`,
                    );
                }
                if (!/^\d{2}:\d{2}$/.test(String(item.duracao))) {
                    throw new BadRequestException(
                        `DTL: 'duracao' deve estar no formato HH:MM. Recebido: '${item.duracao}'`,
                    );
                }
            }
        }

        if (sigla === 'ietl') {
            for (const item of args) {
                if (typeof item.curso === 'undefined' || !Array.isArray(item.seq)) {
                    throw new BadRequestException(
                        `IETL: cada entrada deve ter 'curso' e 'seq' (array). Entrada inválida: ${JSON.stringify(item)}`,
                    );
                }
                for (const s of item.seq) {
                    if (!s.duracao || !/^\d{2}:\d{2}$/.test(String(s.duracao))) {
                        throw new BadRequestException(
                            `IETL: cada item de 'seq' deve ter 'duracao' no formato HH:MM. Recebido: '${s.duracao}'`,
                        );
                    }
                }
            }
        }
    }
}