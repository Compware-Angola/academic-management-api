import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmpty, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class FindAssiduidadeDTO {


  @ApiPropertyOptional({ example: 438, description: 'ID da Grade Curricular (0 para todas)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  gradeId?: number;

    @ApiPropertyOptional({ example: 438, description: 'ID do Período ' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  periodoId?: number;


  @ApiPropertyOptional({ example: 3, description: 'ID do Estado do Agendamento (0 para todos)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  estadoAgendamento?: number;

  @ApiPropertyOptional({ example: '2022-10-07', description: 'Data de início (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  dataInicio?: string;

  @ApiPropertyOptional({ example: '2022-10-14', description: 'Data de fim (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  dataFim?: string;

  @ApiPropertyOptional({ example: 2026, description: 'Ano Lectivo (0 para todos)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  anoLectivo?: number;

  @ApiPropertyOptional({ example: 1, description: 'Semestre (0 para todos)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  semestre?: number;

  @ApiPropertyOptional({ example: 1, description: 'Página atual' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 20, description: 'Limite de registros por página' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}