import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class LancarNotaArquitecturaDto {
  @ApiProperty({ description: 'Nota prática do candidato', example: 12 })
  @IsNumber()
  @Min(0)
  notaPratica: number;
}
