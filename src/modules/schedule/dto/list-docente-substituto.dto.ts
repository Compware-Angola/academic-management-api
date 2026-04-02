// list-docente-substituto.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListDocenteSubstitutoDto {
  @ApiPropertyOptional({ example: 1, description: 'ID do ano lectivo (obrigatório)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  anoLectivo?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID do semestre (1 ou 2)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  semestre?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID do período' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  periodo?: number;

  @ApiPropertyOptional({ example: 5, description: 'ID do curso' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  curso?: number;

  @ApiPropertyOptional({ example: 3, description: 'ID do ano curricular (classe)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  anoCurricular?: number;

  @ApiPropertyOptional({ example: 10, description: 'ID da unidade curricular' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unidadeCurricular?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID do docente original' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fkDocenteOriginal?: number;

  @ApiPropertyOptional({ example: 2, description: 'ID do docente substituto' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fkDocenteSubstituto?: number;

  @ApiPropertyOptional({ example: 10, description: 'ID do horário' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fkHorario?: number;

  @ApiPropertyOptional({ example: '2025-01-01', description: 'Data de início (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dataInicio?: string;

  @ApiPropertyOptional({ example: '2025-06-30', description: 'Data de término (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dataTermino?: string;

  @ApiPropertyOptional({ example: 1, description: 'Número da página', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 25, description: 'Quantidade de registos por página', default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}