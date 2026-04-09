import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class FilterResultadosFinaisDto {
  @ApiPropertyOptional({ description: 'Busca por nome ou documento' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  codigoAnoLetivo?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoCurso?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoFaculdade?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoTurno?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoSala?: number;

  @ApiPropertyOptional({ example: 20260001 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoCandidato?: number;

  @ApiPropertyOptional({ example: '01/03/2026', required: false })
  @IsOptional()
  @IsString()
  dataInicio?: string;

  @ApiPropertyOptional({ example: '31/03/2026', required: false })
  @IsOptional()
  @IsString()
  dataFim?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}
