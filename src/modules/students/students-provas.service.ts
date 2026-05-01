import { Injectable } from "@nestjs/common";
import { StudentNoteService } from "./sudents-notes.service";
import { FindProvasRecursoDto } from "./dto/recursos.dto";



@Injectable()
export class StudentsProvasService {
    constructor(private readonly studentNoteService: StudentNoteService) { }

    private temNota(valor: string | null | undefined): boolean {
        return valor !== '' && valor !== null && valor !== undefined;
    }

    private jaPassouPorEtapaAposExame(cadeira: any): boolean {
        return (
            this.temNota(cadeira.notaRec) || // R   - Recurso
            this.temNota(cadeira.notaOr) || // O   - Prova Oral
            this.temNota(cadeira.notaOrRec) || // OR  - Oral de Recurso
            this.temNota(cadeira.notaEE) || // EE  - Época Especial
            this.temNota(cadeira.notaOEE) || // OEE - Oral Época Especial
            this.temNota(cadeira.notaMel)      // M   - Melhoria de Notas
        );
    }

    async cadeirasRecurso(dto: FindProvasRecursoDto) {
        const { data } = await this.studentNoteService.findAll({
            anoLectivo: dto.anoLectivo,
            codigoMatricula: dto.codigoMatricula,
        });

        const cadeirasParaRecurso = data.filter((cadeira: any) => {
            const reprovado = cadeira.resultado === 'Reprovado';
            const naoPassouEtapasPosExame = !this.jaPassouPorEtapaAposExame(cadeira);

            return reprovado && naoPassouEtapasPosExame;
        });

        return {
            total: cadeirasParaRecurso.length,
            matricula: dto.codigoMatricula,
            anoLectivo: dto.anoLectivo,
            nomeCompleto: cadeirasParaRecurso[0]?.nome_completo ?? null,
            cadeiras: cadeirasParaRecurso.map((cadeira: any) => ({
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
                    nota1frequencia: cadeira.nota1f || null, // 1ª Frequência
                    nota2frequencia: cadeira.nota2f || null, // 2ª Frequência
                    notaExame: cadeira.notaEx || null, // Exame
                    notaPratica: cadeira.notaPra || null, // Prática
                },
            })),
        };
    }
}