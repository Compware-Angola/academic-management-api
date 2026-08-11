import { DataSource } from 'typeorm';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CandidatoNotaDto } from './dto/definir-nota-admissao.dto';


const NOTA_MINIMA_APROVACAO = 10;

@Injectable()
export class AdmissaoManualService {
    constructor(private readonly dataSource: DataSource) { }

    // ---------------------------------------------------------------------
    // Cria admissão com nota definida manualmente (1 ou vários candidatos)
    // ---------------------------------------------------------------------
    async definirNotaEAdmitir(candidatos: CandidatoNotaDto[]) {
        const resultados: {
            candidatoId: number;
            provaId: number;
            nota: number;
            resultado?: string;
            erro?: string;
        }[] = [];

        let processados = 0;
        let erros = 0;

        for (const { candidatoId, provaId, nota } of candidatos) {
            try {
                const resultado = await this.processarCandidato(
                    candidatoId,
                    provaId,
                    nota,
                );
                resultados.push(resultado);
                processados++;
            } catch (error) {
                erros++;
                resultados.push({
                    candidatoId,
                    provaId,
                    nota,
                    erro:
                        error instanceof BadRequestException
                            ? error.message
                            : 'Erro ao gravar admissão',
                });
            }
        }

        return {
            message: 'Processamento concluído',
            total: candidatos.length,
            processados,
            erros,
            resultados,
        };
    }

    private async processarCandidato(
        candidatoId: number,
        provaId: number,
        nota: number,
    ) {
        // confirma que o candidato tem essa prova associada
        const candidatoProvas = await this.dataSource.query<{ PROVA_ID: number }[]>(
            `SELECT PROVA_ID
         FROM FK2_CANDIDATO_PROVAS
        WHERE CANDIDATO_ID = :1
          AND PROVA_ID = :2`,
            [candidatoId, provaId],
        );

        if (!candidatoProvas || candidatoProvas.length === 0) {
            throw new BadRequestException(
                `Prova não encontrada para o candidato ${candidatoId}`,
            );
        }

        // evita duplicar admissão já existente
        const admissaoExistente = await this.dataSource.query<{ PRE_INCRICAO: number }[]>(
            `SELECT PRE_INCRICAO
         FROM FK2_TB_ADMISSAO
        WHERE PRE_INCRICAO = :1`,
            [candidatoId],
        );

        if (admissaoExistente && admissaoExistente.length > 0) {
            throw new BadRequestException(
                `Candidato ${candidatoId} já possui admissão registada`,
            );
        }

        const resultado =
            nota >= NOTA_MINIMA_APROVACAO ? 'Aprovado(a)' : 'Reprovado(a)';

        await this.dataSource.query(
            `INSERT INTO FK2_TB_ADMISSAO (PRE_INCRICAO, MEDIAFINAL, DATA, RESULTADO, CANAL, POLO_ID)
       VALUES (:1, :2, SYSDATE, :3, 1, 1)`,
            [candidatoId, nota, resultado],
        );

        await this.dataSource.query(
            `UPDATE FK2_CANDIDATO_PROVAS SET NOTA = :1 WHERE CANDIDATO_ID = :2`,
            [nota, candidatoId],
        );

        return { candidatoId, provaId, nota, resultado };
    }
}