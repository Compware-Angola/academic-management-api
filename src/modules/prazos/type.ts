export type PrazoResponse = {
  status: 'NAO_DISPONIVEL' | 'ABERTO' | 'ENCERRADO' | 'NAO_CONFIGURADO';
  podeInscrever: boolean;
  mensagem: string;
  data: {
    dataInicio: Date | string | null;
    dataFim: Date | string | null;
    anoLectivo: number;
    codigoStatus: number | null;
  };
}