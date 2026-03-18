// src/horarios/dto/listar-horarios.dto.ts
import { ApiProperty } from '@nestjs/swagger';
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

export class CreateAfectacaoDTO {
  @ApiProperty({
    description: 'Ano letivo obrigatório',
    example: 21,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  anoLectivo: number;

  @ApiProperty({
    description: 'Filtrar por semestre (1 ou 2)',
    example: 1,
    enum: [1, 2],
  })
  @IsInt()
  @IsIn([1, 2], { message: 'semestre deve ser 1 ou 2' })
  @Type(() => Number)
  semestre: number;

  @ApiProperty({
    description: 'Codigo da unidade Curricular',
    example: 1,
    required: true,
  })
  @IsInt()
  @Type(() => Number)
  unidadeCurricular: number;

  @ApiProperty({
    description: 'Codigo do docente',
    example: 1,
    required: true,
  })
  @IsInt()
  @Type(() => Number)
  docente: number;

  @ApiProperty({
    description: 'Codigo da Categoria',
    example: 1,
    required: true,
  })
  @IsInt()
  @Type(() => Number)
  categoria: number;
}
