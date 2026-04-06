import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class FindEstudanteMatriculadoDTO {
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

  @ApiPropertyOptional({ example: 1, description: 'Página atual' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Limite de registros por página',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
