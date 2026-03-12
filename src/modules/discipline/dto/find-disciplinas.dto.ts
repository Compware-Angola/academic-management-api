// src/disciplinas/dto/find-disciplinas.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Min,

  Max,
  IsString,
} from 'class-validator';

export class FindDisciplinasDto {


@ApiPropertyOptional({
  description: 'Filtrar por tipo de unidade curricular',
  example: 'MIC',
})
@IsOptional()
@IsString()
tipoUnidadeCurricular?: string;

@ApiPropertyOptional({
  description: 'Filtrar por natureza de unidade curricular',
  example: 'TP',
})
@IsOptional()
@IsString()
naturezaUnidadeCurricular?: string;
  @ApiPropertyOptional({
    description: 'Filtrar por status',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  status?: number;

  @ApiPropertyOptional({
    description: 'Pesquisar por designação ou nome abreviatura',
    example: 'Matemática',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Número da página',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página (máximo 100)',
    example: 25,
    minimum: 1,
    maximum: 100,
    default: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 25;
}