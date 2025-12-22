
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum EstadoLancamentoPauta {
  PENDENTE = 1,
  APROVADO = 2,
  REJEITADO = 3,
}

export class UpdateEstadoPautaDto {
  @IsNotEmpty()
  @IsEnum(EstadoLancamentoPauta, {
    message: 'Estado deve ser 1 (Pendente), 2 (Aprovado) ou 3 (Rejeitado)',
  })
  fkEstadoLancamentoPauta: EstadoLancamentoPauta;
}