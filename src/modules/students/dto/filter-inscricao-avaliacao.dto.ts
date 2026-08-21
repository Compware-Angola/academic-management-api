import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class FilterInscricaoAvaliacaoDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({
    example: 23,
    description: 'Código do ano lectivo',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  codigoAnoLectivo?: number;

  @ApiPropertyOptional({
    example: 5388,
    description: 'Código da matrícula',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  codigoMatricula?: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'Código do curso',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  codigoCurso?: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'Código do Grade',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  codigoGrade?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Código da classe / ano curricular',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  codigoClasse?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Código do semestre',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  codigoSemestre?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Código da disciplina',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  codigoDisciplina?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Código da Horario',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  codigoHorario?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Estado da factura',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  estadoFactura?: number;

  @ApiPropertyOptional({
    example: 'Nzinga',
    description:
      'Pesquisa por nome do estudante, disciplina ou código da matrícula',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Código do tipo de avaliação',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tipoAvaliacao?: number;
}
