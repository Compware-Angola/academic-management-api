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
    description: 'Tipo de Avaliacao Obrigário',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  tipoAvaliacao: number;

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
