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
} from 'class-validator';

export class MarkingAssessmentDTO {
  @ApiProperty({
    description: 'Ano letivo obrigatório',
    example: 22,
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
  @IsIn([1, 2], { message: 'semestre deve ser 1 ou 2' })
  @Type(() => Number)
  semestre: number;
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Filtrar por período',
    example: 5,
  })
  @IsInt()
  @Type(() => Number)
  periodo: number;

  @ApiPropertyOptional({
    description: 'Filtrar por código do curso',
    example: 20,
  })
  @IsInt()
  @Type(() => Number)
  curso: number;

  @ApiPropertyOptional({
    description: 'Filtrar por código da ano curricular (grade curricular)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  anoCurricular: number;

  @ApiPropertyOptional({
    description: 'Filtrar por código do Horário',
    example: 24879,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  horarioId: number;

  @ApiPropertyOptional({
    description: 'Filtrar por unidade curricular',
    example: 171,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  unidadeCurricular: number;

  @ApiPropertyOptional({
    description: 'Filtrar por código da da avaliacao',
    example: 2,
  })
  @IsInt()
  @Type(() => Number)
  tipoAvaliacao: number;

  @ApiPropertyOptional({
    description:
      'Filtrar por tipo de horário caso 1 - Horários com provas, caso 2 Horários sem provas',
    example: 1,
  })
  @IsInt()
  @Type(() => Number)
  tipoHorario: number;
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
