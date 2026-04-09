import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterProvaMarcacaoDto {
  @ApiPropertyOptional({
    description: 'Buscar por nome completo ou bilhete de identidade',
    example: 'João Silva',
  })
  @IsOptional()
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
  codigoGrau?: number;

  @ApiPropertyOptional({
    description: 'com_prova | sem_prova',
    enum: ['com_prova', 'sem_prova'],
  })
  @IsIn(['com_prova', 'sem_prova'])
  filtroProva?: 'com_prova' | 'sem_prova';

  @ApiPropertyOptional({
    description: 'Status da prova: 0, 1. Ignorado se filtroProva = sem_prova',
  })
  @IsOptional()
  @IsNumber()
  @IsIn([0, 1])
  @Type(() => Number)
  statusProva?: number;

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
