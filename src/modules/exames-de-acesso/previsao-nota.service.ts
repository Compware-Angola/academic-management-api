import { DataSource } from 'typeorm';
import { BadRequestException, Injectable } from '@nestjs/common';
import { FilterCandidatoProvaDto } from './dto/filter-candidato-prova.dto';


interface ProvaRow {
    PERGUNTAS: string;
}

interface CandidatoProvaRow {
    NUMERO_INSCRICAO: number;
    NOME: string;
    NUMERO_BILHETE: string;
    CODIGO_CURSO: string;
    CURSO: string;
    CODIGO_SALA: string;
    SALA: string;
    CODIGO_ANO_LECTIVO: number;
    ANO_LECTIVO: string;
    DATA_REALIZACAO: string;
    HORA_INICIO: string;
    PROVA_ID: number;
}

@Injectable()
export class PrevisaoNotaService {
    constructor(private readonly dataSource: DataSource) { }

    // ---------------------------------------------------------------------
    // Cálculo puro da nota — NÃO grava nada no banco (sem INSERT/UPDATE)
    // ---------------------------------------------------------------------
    private async computeNota(
        candidatoId: number,
        provaId: number,
    ): Promise<{ nota: number; resultado: string }> {
        const provas = await this.dataSource.query<ProvaRow[]>(
            `SELECT PERGUNTAS FROM FK2_PROVAS WHERE ID = :1`,
            [provaId],
        );

        if (!provas || provas.length === 0) {
            throw new BadRequestException('Prova não encontrada');
        }

        let perguntasIds: number[] = [];
        try {
            const parsed: unknown = JSON.parse(provas[0].PERGUNTAS);
            if (Array.isArray(parsed)) {
                perguntasIds = (parsed as Array<number | { id: number }>).map((p) =>
                    typeof p === 'object' && p !== null ? p.id : p,
                );
            }
        } catch {
            if (typeof provas[0].PERGUNTAS === 'string') {
                perguntasIds = provas[0].PERGUNTAS.split(',')
                    .map((id) => parseInt(id.trim(), 10))
                    .filter((id) => !isNaN(id));
            }
        }

        if (perguntasIds.length === 0) {
            throw new BadRequestException('A prova não possui perguntas cadastradas');
        }

        const placeholders = perguntasIds.map((_, i) => `:${i + 1}`).join(',');
        const perguntas = await this.dataSource.query<{ ID: number; COTACAO: number }[]>(
            `SELECT ID, COTACAO
         FROM FK2_PERGUNTAS
        WHERE ID IN (${placeholders})
          AND DELETED_AT IS NULL`,
            perguntasIds,
        );

        const respostas = await this.dataSource.query<{ PERGUNTA_ID: number; TIPO_RESPOSTA_ID: number }[]>(
            `SELECT CR.PERGUNTA_ID, R.TIPO_RESPOSTA_ID
         FROM FK2_CANDIDATO_RESPOSTAS CR
         JOIN FK2_RESPOSTAS R ON CR.RESPOSTA_ID = R.ID
        WHERE CR.CANDIDATO_ID = :1
          AND CR.PROVA_ID = :2`,
            [candidatoId, provaId],
        );

        const respostasMap = new Map<number, number>(
            respostas.map((r) => [Number(r.PERGUNTA_ID), Number(r.TIPO_RESPOSTA_ID)]),
        );

        let nota = 0;
        for (const pergunta of perguntas) {
            const tipoResposta = respostasMap.get(Number(pergunta.ID));
            if (tipoResposta === 1) {
                nota += Number(pergunta.COTACAO);
            }
        }

        const resultado = nota >= 10 ? 'Admitido(a)' : 'Reprovado(a)';

        return { nota, resultado };
    }

    // ---------------------------------------------------------------------
    // Lista candidatos com prova feita, ainda NÃO corrigidos, + nota prevista
    // (rota somente de leitura — não altera nada no banco)
    // ---------------------------------------------------------------------
    async buscarProvasPendentesComNotaPrevista(filtros: FilterCandidatoProvaDto) {
        const condicoes: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (filtros.codigoSala) {
            condicoes.push(`FK2_TB_SALAS.CODIGO = :${paramIndex++}`);
            params.push(filtros.codigoSala);
        }

        if (filtros.codigoCurso) {
            condicoes.push(`FK2_TB_CURSOS.CODIGO = :${paramIndex++}`);
            params.push(filtros.codigoCurso);
        }

        if (filtros.dataRealizacao) {
            condicoes.push(
                `FK2_TB_HORARIO_PROVA.DATA_REALIZACAO = TO_DATE(:${paramIndex++}, 'DD/MM/YYYY')`,
            );
            params.push(filtros.dataRealizacao);
        }

        if (filtros.horaInicio) {
            condicoes.push(`
        fn_formatar_hora(
          DBMS_LOB.SUBSTR(FK2_TB_HORARIO_PROVA.HORA_INICIO, 4000, 1)
        ) = :${paramIndex++}
      `);
            params.push(filtros.horaInicio.substring(0, 5));
        }

        if (filtros.codigoAnoLetivo) {
            condicoes.push(`FK2_TB_HORARIO_PROVA.ANO_LECTIVO_ID = :${paramIndex++}`);
            params.push(filtros.codigoAnoLetivo);
        }

        if (filtros.search) {
            const nomeIndex = paramIndex++;
            const biIndex = paramIndex++;
            condicoes.push(`(
        UPPER(FK2_TB_PREINSCRICAO.NOME_COMPLETO) LIKE UPPER(:${nomeIndex})
        OR UPPER(FK2_TB_PREINSCRICAO.BILHETE_IDENTIDADE) LIKE UPPER(:${biIndex})
      )`);
            const termo = `%${filtros.search.trim()}%`;
            params.push(termo, termo);
        }
        // Nunca deve trazer candidatos sem prova atribuída, independente de filtros
        condicoes.push(`FK2_CANDIDATO_PROVAS.PROVA_ID IS NOT NULL`);

        const extraWhere =
            condicoes.length > 0 ? condicoes.map((c) => `AND ${c}`).join('\n') : '';

        // guarda o número de parâmetros de FILTRO antes de adicionar offset/limit
        // -> resolve o problema do count query, independente de quantos filtros existirem
        const filterParams = [...params];

        const page = filtros.page ?? 1;
        const limit = filtros.limit ?? 10;
        const offset = (page - 1) * limit;

        const offsetIndex = paramIndex++;
        const limitIndex = paramIndex++;
        params.push(offset, limit);

        const sqlBase = `
      FROM FK2_TB_PREINSCRICAO
         , FK2_TB_CURSOS
         , (
             SELECT cp.* FROM (
               SELECT c.*, ROW_NUMBER() OVER (
                        PARTITION BY c.CANDIDATO_ID
                        ORDER BY c.ID DESC
                      ) AS RN
               FROM FK2_CANDIDATO_PROVAS c
               WHERE c.STATUS_ = 1
             ) cp
             WHERE cp.RN = 1
           ) FK2_CANDIDATO_PROVAS
         , FK2_TB_HORARIO_PROVA
         , FK2_TB_SALAS
         , FK2_TB_ANO_LECTIVO
     WHERE FK2_TB_PREINSCRICAO.CURSO_CANDIDATURA = FK2_TB_CURSOS.CODIGO
       AND FK2_CANDIDATO_PROVAS.CANDIDATO_ID = FK2_TB_PREINSCRICAO.CODIGO
       AND FK2_TB_HORARIO_PROVA.ID = FK2_CANDIDATO_PROVAS.HORARIO_PROVA_ID
       AND FK2_TB_SALAS.CODIGO = FK2_TB_HORARIO_PROVA.SALA_ID
       AND FK2_TB_HORARIO_PROVA.ANO_LECTIVO_ID = FK2_TB_ANO_LECTIVO.CODIGO
       AND NOT EXISTS (
         SELECT 1 FROM FK2_TB_ADMISSAO a
          WHERE a.PRE_INCRICAO = FK2_TB_PREINSCRICAO.CODIGO
       )
       ${extraWhere}
    `;

        const sql = `
    SELECT FK2_TB_PREINSCRICAO.CODIGO AS NUMERO_INSCRICAO
         , FK2_TB_PREINSCRICAO.NOME_COMPLETO NOME
         , FK2_TB_PREINSCRICAO.BILHETE_IDENTIDADE NUMERO_BILHETE
         , FK2_TB_CURSOS.CODIGO AS CODIGO_CURSO
         , FK2_TB_CURSOS.DESIGNACAO AS CURSO
         , FK2_TB_SALAS.CODIGO AS CODIGO_SALA
         , FK2_TB_SALAS.DESIGNACAO AS SALA
         , FK2_TB_HORARIO_PROVA.ANO_LECTIVO_ID AS CODIGO_ANO_LECTIVO
         , FK2_TB_ANO_LECTIVO.DESIGNACAO AS ANO_LECTIVO
         , TO_CHAR(FK2_TB_HORARIO_PROVA.DATA_REALIZACAO, 'DD/MM/YYYY') AS DATA_REALIZACAO
         , fn_formatar_hora(DBMS_LOB.SUBSTR(FK2_TB_HORARIO_PROVA.HORA_INICIO, 4000, 1)) AS HORA_INICIO
         , FK2_CANDIDATO_PROVAS.PROVA_ID AS PROVA_ID
    ${sqlBase}
    ORDER BY FK2_TB_PREINSCRICAO.NOME_COMPLETO
    OFFSET :${offsetIndex} ROWS
    FETCH NEXT :${limitIndex} ROWS ONLY
    `;

        const sqlCount = `SELECT COUNT(*) AS TOTAL ${sqlBase}`;

        const [data, total] = await Promise.all([
            this.dataSource.query<CandidatoProvaRow[]>(sql, params),
            this.dataSource.query<{ TOTAL: number }[]>(sqlCount, filterParams),
        ]);

        const dataComNotaPrevista = await Promise.all(
            data.map(async (row) => {
                try {
                    const { nota, resultado } = await this.computeNota(
                        row.NUMERO_INSCRICAO,
                        row.PROVA_ID,
                    );
                    return { ...row, NOTA_PREVISTA: nota, RESULTADO_PREVISTO: resultado };
                } catch (error) {
                    return {
                        ...row,
                        NOTA_PREVISTA: null,
                        RESULTADO_PREVISTO: null,
                        erro:
                            error instanceof BadRequestException
                                ? error.message
                                : 'Erro ao calcular nota prevista',
                    };
                }
            }),
        );

        return this.toLower({
            data: dataComNotaPrevista,
            total: Number(total[0].TOTAL),
            page,
            limit,
            totalPages: Math.ceil(Number(total[0].TOTAL) / limit),
        });
    }

    private toLower(obj: any): any {
        if (Array.isArray(obj)) {
            return obj.map((item) => this.toLower(item));
        }
        if (obj !== null && typeof obj === 'object') {
            return Object.keys(obj).reduce((acc, key) => {
                acc[key.toLowerCase()] = this.toLower(obj[key]);
                return acc;
            }, {} as any);
        }
        return obj;
    }
}