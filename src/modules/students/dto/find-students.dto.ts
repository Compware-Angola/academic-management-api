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
  IsString,
} from 'class-validator';

export class FindStudentsDTO {
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
    description: 'Codigo do Curso',
    example: 6,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoCurso: number;

  @ApiProperty({
    description: 'Codigo da Faculdade',
    example: 1,
    required: false,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  faculdadeId: number;

  @ApiPropertyOptional({
    description: 'Filtrar por Unidade Curricular',
    example: 486,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoMatricula?: number;

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
