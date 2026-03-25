import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class FilterProvaResultadoDto {
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
  codigoTurno?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoFaculdade?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoSala?: number;

  @ApiPropertyOptional({ description: '0 = Reprovado, 1 = Aprovado' })
  @IsOptional()
  @IsNumber()
  @IsIn([0, 1])
  @Type(() => Number)
  resultado?: number;

  @ApiProperty({ example: '01/03/2026', required: false })
  @IsNotEmpty()
  @IsOptional()
  @IsString()
  dataInicio: string;

  @ApiProperty({ example: '31/03/2026', required: false })
  @IsNotEmpty()
  @IsOptional()
  @IsString()
  dataFim: string;

  @ApiPropertyOptional({ example: 'João Silva', description: 'Pesquisa por nome ' })
  @IsOptional()
  @IsString()
  search?: string;

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