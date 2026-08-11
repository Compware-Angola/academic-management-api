// src/disciplinas/dto/find-disciplinas.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';
export class FindUnidadeCurricularDeptDto {
  @ApiProperty({ example: 1, description: 'Filtrar por departamento', required: true })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  departamento: number;
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