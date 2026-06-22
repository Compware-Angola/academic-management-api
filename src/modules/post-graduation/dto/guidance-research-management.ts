import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class StudentsQueryDto {
  @ApiPropertyOptional({ description: 'Ano letivo', example: 21 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  anoLectivo?: number;

  @ApiPropertyOptional({ description: 'Tipo de candidatura', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tipoCandidatura?: number;

  @ApiPropertyOptional({ description: 'Código do curso', example: 10 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  curso?: number;

  @ApiPropertyOptional({ description: 'Pesquisa', example: 'José' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Número da página', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;


  @ApiPropertyOptional({ description: 'Número de registros por página', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Type(() => Number)
  limit?: number;
}