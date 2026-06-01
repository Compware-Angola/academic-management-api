import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class DesdiplomarAlunoDTO {
  @ApiProperty({
    example: 40014,
    description: 'Código da matrícula do estudante',
  })
  @IsInt()
  codigoMatricula: number;

  @ApiPropertyOptional({
    example: 'Diplomação anulada por inconsistência académica.',
    description: 'Motivo da anulação do diploma',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  motivo?: string;
}
