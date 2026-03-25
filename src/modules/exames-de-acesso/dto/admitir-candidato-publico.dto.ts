import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class AdmitirCandidatoPublicoDto {
  @ApiProperty({ description: 'Nota do candidato', example: 15 })
  @IsNumber()
  @Min(0)
  nota: number;
}
