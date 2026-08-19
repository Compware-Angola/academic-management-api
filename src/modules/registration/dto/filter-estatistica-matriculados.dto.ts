import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional } from 'class-validator';

export class FilterEstatisticaMatriculadosDto {
  @ApiPropertyOptional({
    description: 'Código do Ano Lectivo',
    example: 22,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoAnoLectivo?: number;

  @ApiPropertyOptional({
    description: 'Código do Curso',
    example: 6,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoCurso?: number;

  @ApiPropertyOptional({
    description: 'Código do Período',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  periodo?: number;

  @ApiPropertyOptional({
    description: 'Tipo de Estudante (0=Antigo, 1=Novo)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tipoEstudante?: number;

  @ApiPropertyOptional({
    description: 'Ano Curricular',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  anoCurricular?: number;
}
