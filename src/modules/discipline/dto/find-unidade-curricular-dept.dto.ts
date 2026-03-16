// src/disciplinas/dto/find-disciplinas.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';
export class FindUnidadeCurricularDeptDto {
  @ApiPropertyOptional({ example: 1, description: 'Filtrar por departamento' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  departamento?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filtrar por classe' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  classe?: number;
@ApiPropertyOptional({ example: 1 })
@IsOptional()
@IsInt()
@Min(0)
@Max(1)
@Type(() => Number)
estado?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filtrar por semestre' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  semestre?: number;

  @ApiPropertyOptional({ example: 'Matemática', description: 'Pesquisar por nome da disciplina' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 25, default: 25, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 25;
}