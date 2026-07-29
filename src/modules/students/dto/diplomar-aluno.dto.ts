import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class DiplomarAlunoDTO {
  @ApiProperty({
    example: 40014,
    description: 'Código da matrícula do estudante',
  })
  @IsInt()
  codigoMatricula: number;

  @ApiPropertyOptional({
    example: '2026-04-21',
    description: 'Data de conclusão do curso',
  })
  @IsOptional()
  @IsDateString()
  dataConclusao?: string;

  @ApiPropertyOptional({
    example: '2026-04-21',
    description: 'Data da acta de diplomação',
  })
  @IsOptional()
  @IsDateString()
  dataActa?: string;

  @ApiPropertyOptional({
    example: 'ACTA_9F3KX2P1.pdf',
    description: 'Nome do ficheiro da acta salvo no storage (S3)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileName?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Indica se deve gerar declaração de fim de curso',
  })
  @IsOptional()
  @IsBoolean()
  imprimeCartaConclusao?: boolean;
}
