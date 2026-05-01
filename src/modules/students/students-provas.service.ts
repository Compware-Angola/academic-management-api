import { Injectable } from "@nestjs/common";
import { StudentNoteService } from "./sudents-notes.service";
import { FindProvasRecursoDto } from "./dto/recursos.dto";

interface AvaliacaoItem {
    obs: string[];
    formula: string[];
    nota1f: string;
    nota2f: string;
    notaEx: string;
    notaRec: string;
    notaPra: string;
    notaOr: string;
    notaOrRec: string;
    notaMel: string;
    notaEE: string;
    notaOEE: string;
    ano: string;
    codigoGradeAluno: number;
    disciplina: string;
    duracao: string;
    gradeCurricula: number;
    matricula: number;
    media: string;
    nome_completo: string;
    num_matricula: string;
    resultado: string;
    semestre: string;
    unidadeCurricular: string;
}

@Injectable()
export class StudentsProvasService {
    constructor(private readonly studentNoteService: StudentNoteService) { }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private temNota(valor: string | null | undefined): boolean {
        return valor !== '' && valor !== null && valor !== undefined;
    }

    private jaPassouPorEtapaAposExame(cadeira: AvaliacaoItem): boolean {
        return (
            this.temNota(cadeira.notaRec) || // R   - Recurso
            this.temNota(cadeira.notaOr) || // O   - Prova Oral
            this.temNota(cadeira.notaOrRec) || // OR  - Oral de Recurso
            this.temNota(cadeira.notaEE) || // EE  - Época Especial
            this.temNota(cadeira.notaOEE) || // OEE - Oral Época Especial
            this.temNota(cadeira.notaMel)      // M   - Melhoria de Notas
        );
    }

    private mapearCadeira(cadeira: AvaliacaoItem) {
        return {
            codigoGradeAluno: cadeira.codigoGradeAluno,
            gradeCurricula: cadeira.gradeCurricula,
            disciplina: cadeira.disciplina,
            unidadeCurricular: cadeira.unidadeCurricular,
            semestre: cadeira.semestre,
            duracao: cadeira.duracao,
            ano: cadeira.ano,
            media: cadeira.media,
            resultado: cadeira.resultado,
            formula: cadeira.formula,
            obs: cadeira.obs,
            notas: {
                nota1f: cadeira.nota1f || null, // 1ª Frequência
                nota2f: cadeira.nota2f || null, // 2ª Frequência
                notaEx: cadeira.notaEx || null, // Exame
                notaPra: cadeira.notaPra || null, // Prática
            },
        };
    }

    // ─── Cadeiras para Recurso ───────────────────────────────────────────────────

    async cadeirasRecurso(dto: FindProvasRecursoDto) {
        const { data } = await this.studentNoteService.findAll({
            anoLectivo: dto.anoLectivo,
            codigoMatricula: dto.codigoMatricula,
        });

        const cadeirasParaRecurso = data.filter((cadeira: AvaliacaoItem) => {
            const reprovado = cadeira.resultado === 'Reprovado';
            const naoPassouEtapasPosExame = !this.jaPassouPorEtapaAposExame(cadeira);

            return reprovado && naoPassouEtapasPosExame;
        });

        return {
            total: cadeirasParaRecurso.length,
            matricula: dto.codigoMatricula,
            anoLectivo: dto.anoLectivo,
            nomeCompleto: cadeirasParaRecurso[0]?.nome_completo ?? null,
            cadeiras: cadeirasParaRecurso.map(this.mapearCadeira.bind(this)),
        };
    }

    // ─── Cadeiras para Época Especial ────────────────────────────────────────────

    async cadeirasEpocaEspecial(dto: FindProvasRecursoDto) {
        const { data } = await this.studentNoteService.findAll({
            anoLectivo: dto.anoLectivo,
            codigoMatricula: dto.codigoMatricula,
        });

        const cadeirasParaEE = data.filter((cadeira: AvaliacaoItem) => {
            const reprovado = cadeira.resultado === 'Reprovado';

            // Já fez EE ou Oral EE — não pode se inscrever novamente
            const jaFezEpocaEspecial =
                this.temNota(cadeira.notaEE) ||
                this.temNota(cadeira.notaOEE);

            // Cenário 1: não fez nem Recurso nem Oral de Recurso
            const foiDiretoSemRecurso =
                !this.temNota(cadeira.notaRec) &&
                !this.temNota(cadeira.notaOrRec);

            // Cenário 2: fez Recurso e reprovou (com ou sem Oral de Recurso)
            const fezRecursoEReprovou =
                this.temNota(cadeira.notaRec) &&
                cadeira.resultado === 'Reprovado';

            // Cenário 3: fez Oral de Recurso e reprovou
            const fezOralRecursoEReprovou =
                this.temNota(cadeira.notaOrRec) &&
                cadeira.resultado === 'Reprovado';

            const podeInscreverEE =
                foiDiretoSemRecurso ||
                fezRecursoEReprovou ||
                fezOralRecursoEReprovou;

            return reprovado && !jaFezEpocaEspecial && podeInscreverEE;
        });

        return {
            total: cadeirasParaEE.length,
            matricula: dto.codigoMatricula,
            anoLectivo: dto.anoLectivo,
            nomeCompleto: cadeirasParaEE[0]?.nome_completo ?? null,
            cadeiras: cadeirasParaEE.map((cadeira: AvaliacaoItem) => ({
                ...this.mapearCadeira(cadeira),
                // inclui também as notas de recurso para contexto
                notasRecurso: {
                    notaRec: cadeira.notaRec || null, // R  - Recurso
                    notaOrRec: cadeira.notaOrRec || null, // OR - Oral de Recurso
                },
            })),
        };
    }
}