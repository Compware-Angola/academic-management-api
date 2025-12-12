import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Min,
  Max,
  IsNumber,
  IsPositive,
  IsIn,
} from 'class-validator';

export class ListScheduleDocenteDto {
  @ApiProperty({
    description: 'Identificador único do docente',
    example: 2273,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  docenteId: number;

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
  @IsOptional()
  @IsInt()
  @IsIn([1, 2], { message: 'semestre deve ser 1 ou 2' })
  @Type(() => Number)
  semestre?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por período',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  periodo?: number;

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
