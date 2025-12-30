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
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';

export class StatisticAssessmentDTO {
  @ApiProperty({
    description: 'Ano letivo obrigatório',
    example: 22,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  anoLectivo: number;

  @ApiProperty({
    description: 'Tipo de Prova Obrigário',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  tipoProva: number;

  @ApiProperty({
    description: 'Tipos de Avaliação (array de ids)',
    example: [2, 3],
    type: [Number],
    minimum: 1,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  @IsPositive({ each: true })
  @Type(() => Number)
  tipoAvaliacao: number[];

  @ApiProperty({
    description: 'id do Horário',
    example: 24879,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  horarioId: number;

  @ApiProperty({
    description: 'id da grade curricular',
    example: 171,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  gradeId: number;
}
