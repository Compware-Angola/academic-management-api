import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional } from 'class-validator';

export class ExportEstudanteMatriculadoDTO {
  @ApiProperty({
    description: 'Ano Lectivo',
    example: 22,
    required: true,
  })
  @IsInt()
  @Type(() => Number)
  codigoAnoLectivo: number;

  @ApiProperty({
    description: 'Código de Curso',
    example: 6,
  })
  @IsInt()
  @Type(() => Number)
  codigoCurso: number;

  @ApiPropertyOptional({
    description: 'Código de Periodo',
    example: 5,
  })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  periodo?: number;

  @ApiPropertyOptional({
    description: 'Tipo de Estudante',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tipoEstudante?: number;

  @ApiPropertyOptional({
    description: 'anoCurricular',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  anoCurricular?: number;
}
