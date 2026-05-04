export type AvaliacaoItem = {
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

export type ServicoPagamento = {
    codigo: number;
    descricao: string;
    preco: number;
    taxa_iva: number;
    sigla: string;
}
    