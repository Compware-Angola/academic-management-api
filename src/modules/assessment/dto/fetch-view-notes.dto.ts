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

export class FetchViewNotesDTO {
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
    description: 'id do Horário ou turma',
    example: 24879,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  horarioOrTurmaId: number;

  @ApiProperty({
    description: 'unidade curricular id',
    example: 171,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  gradeId: number;

  @ApiProperty({
    description: '1- para consultar por horario e 2 - consultar por turma',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  tipoConsulta: number;

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
