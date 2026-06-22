export interface PrazoResponse {
  codigoTipoCandidatura:number
  status: 'ABERTO' | 'ENCERRADO' | 'NAO_DISPONIVEL' | 'NAO_CONFIGURADO';

  podeInscrever: boolean;

  mensagem: string;

  data: {
    anoLectivo: number;
    codigoStatus: number | null;
    dataInicio: Date | null;
    dataFim: Date | null;
  };
}
