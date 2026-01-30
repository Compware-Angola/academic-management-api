import { IsInt } from 'class-validator';

export class UpdateAcessoEstadoDto {
  @IsInt()
  acessoId: number;

  @IsInt()
  userId: number;
}
