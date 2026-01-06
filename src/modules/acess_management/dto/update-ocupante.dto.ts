import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOcupanteDto {
  @ApiProperty({ description: 'ID do novo utilizador que vai ocupar o cargo' })
  @IsInt()
  novoUtilizadorId: number;
}