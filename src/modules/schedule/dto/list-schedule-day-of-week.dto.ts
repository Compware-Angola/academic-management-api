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
  IsEnum,
} from 'class-validator';
import { DiaSemana } from './create-schedule.dto';

export class ListScheduleDayOfWeekto {
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
   @IsOptional()
  @IsIn([1, 2], { message: 'semestre deve ser 1 ou 2' })
  @Type(() => Number)
  semestre?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por ano curricular (ex: 1, 2, 3...)',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  anoCurricular?: number;
@ApiProperty({
  description: 'Dia da semana (1=Segunda ... 7=Domingo)',
  enum: DiaSemana,
  example: 3,
})

@IsEnum(DiaSemana)
@Type(() => Number) 
diaSemana: DiaSemana;

  @ApiPropertyOptional({
    description: 'Filtrar por período',
    example: 6,
  })
   @IsOptional()
  @IsInt()
  @Type(() => Number)
  periodo?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por código do curso',
    example: 15,
  })
   @IsOptional()
  @IsInt()
  @Type(() => Number)
  curso?: number;



  @ApiPropertyOptional({
    description: 'Filtrar por código da unidade curricular (grade curricular)',
    example: 789,
  })
   @IsOptional()
  @IsInt()
  @Type(() => Number)
  unidadeCurricular?: number;

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