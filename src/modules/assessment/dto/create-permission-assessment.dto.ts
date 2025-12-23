// src/horarios/dto/listar-horarios.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsPositive,
  IsIn,
  IsDateString,
} from 'class-validator';

export class CreatePermissionAssessmentDTO {
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
    description: 'Filtrar por código da unidade curricular (grade curricular)',
    example: 750,
  })
  @IsInt()
  @Type(() => Number)
  unidadeCurricular: number;

  @ApiProperty({
    description: 'ID utilizador',
    example: 303,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  userId: number;

  @ApiProperty({
    description: 'Id Docente',
    example: 2052,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  docenteId: number;

  @ApiProperty({
    description: 'Tipo de Avaliação',
    example: 7,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  tipoAvalacaoId: number;

  @ApiProperty({
    description: 'Data de início da permissão',
    example: '2025-12-18',
  })
  @IsDateString()
  dataInicio: string;

  @ApiProperty({
    description: 'Data de fim da permissão',
    example: '2025-12-19',
  })
  @IsDateString()
  dataFim: string;
}
