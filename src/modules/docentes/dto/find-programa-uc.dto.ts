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

export class FindProgramaUCDTO {
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
    required: true,
    enum: [1, 2],
  })
  @IsInt()
  @IsIn([1, 2], { message: 'semestre deve ser 1 ou 2' })
  @Type(() => Number)
  semestre: number;

  @ApiProperty({
    description: 'Codigo do Curso',
    example: 6,
    required: true,
  })
  @IsInt()
  @Type(() => Number)
  codigoCurso: number;

  @ApiProperty({
    description: 'Codigo do Ano Curricular',
    example: 1,
    required: true,
  })
  @IsInt()
  @Type(() => Number)
  anoCurricular: number;

  @ApiPropertyOptional({
    description: 'Filtrar por docente',
    example: 486,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  docenteId?: number;

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


export class CreateProgramaUCDTO {
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
    required: true,
    enum: [1, 2],
  })
  @IsInt()
  @IsIn([1, 2], { message: 'semestre deve ser 1 ou 2' })
  @Type(() => Number)
  semestre: number;

  @ApiProperty({
    description: 'Codigo do Curso',
    example: 6,
    required: true,
  })
  @IsInt()
  @Type(() => Number)
  codigoCurso: number;

  @ApiProperty({
    description: 'Codigo do Ano Curricular',
    example: 1,
    required: true,
  })
  @IsInt()
  @Type(() => Number)
  anoCurricularCode: number;

  @ApiProperty({
    description: 'Filtrar por docente',
    example: 486,
    required: true,
  })
  @IsInt()
  @Type(() => Number)
  docenteCode: number;

  @ApiProperty({
    description: 'Nome do ficheiro',
    example: 'ficheiro.pdf',
    required: true,
  })
  @IsString()
  @Type(() => String)
  ficheiroName: string;


  @ApiProperty({
    description: 'Estado do programa',
    example: 1,
    required: true,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  estadoPrograma: number;

  @ApiProperty({
    description: 'Codigo da Grade Curricular',
    example: 1,
    required: true,
  })
  @IsInt()
  @Type(() => Number)
  gradeCurricularCode: number;
  
}