// src/horarios/dto/listar-horarios.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Min,
  IsNumber,
  IsPositive,
  IsIn,
  Max,
  IsNotEmpty,
} from 'class-validator';

export class FindDocenteAfectacaoDTO {
  @ApiProperty({
    description: 'Ano letivo obrigatório',
    example: 21,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  anoLectivo: number;

  @ApiPropertyOptional({
    description: 'Filtrar por semestre (1 ou 2)',
    example: 1,
    enum: [1, 2],
  })
  @IsInt()
  @IsOptional()
  @IsIn([1, 2], { message: 'semestre deve ser 1 ou 2' })
  @Type(() => Number)
  semestre: number;

  @ApiPropertyOptional({
    description: 'Tipo Afectacao',
    example: 1,
    required: true,
    enum: [1, 2],
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @IsIn([1, 2], {
    message: '1 Para Afectação com Docente e 2 para Afectação sem Docente',
  })
  tipoAfectacao: number;

  @ApiPropertyOptional({
    description: 'Codigo do docente',
    example: 1,
    required: true,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  docente: number;

  @ApiPropertyOptional({
    description: 'Data inicial do intervalo',
    example: '2025-01-02',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @Type(() => Date)
  dataInicial: Date;

  @ApiPropertyOptional({
    description: 'Data Final do intervalo',
    example: '2025-12-30',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @Type(() => Date)
  dataFinal: Date;

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
