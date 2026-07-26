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

export class FindMarcacaoPrazoDTO {
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
    description: 'Tipo de Candidatura',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  tipoCandidatura?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por semestre (1 ou 2)',
    example: 1,
    enum: [1, 2],
  })
  @IsInt()
  @IsIn([1, 2], { message: 'semestre deve ser 1 ou 2' })
  @Type(() => Number)
  semestre: number;
}
