// src/dto/filtro-lancamento-pauta.dto.ts
import { IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FiltroLancamentoPautaDto {
  @ApiPropertyOptional({
    description: 'Código do Ano Lectivo',
    example: 2024,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  anoLectivo?: number;

  @ApiPropertyOptional({
    description: 'Código do Tipo de Avaliação',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  tipoAvaliacao?: number;

  @ApiPropertyOptional({
    description: 'Código do semestra',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  semestre?: number;

  @ApiPropertyOptional({
    description: 'Código do ano curricular',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  anoCurricular?: number;

  @ApiPropertyOptional({
    description: 'Código da Grade Curricular',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  codigoGrade?: number;

  @ApiPropertyOptional({
    description: 'Código do curso',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  curso?: number;
  @ApiPropertyOptional({
    description: 'Estado da pauta',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  estadoPauta?: number;

  // ---------------- PAGINAÇÃO ----------------

  @ApiPropertyOptional({
    description: 'Número da página atual',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de itens por página',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
