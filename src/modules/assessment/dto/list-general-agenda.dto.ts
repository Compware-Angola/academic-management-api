// src/oral/dto/listar-definir-oral.dto.ts
import { IsInt, Min, IsIn, IsOptional, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeneralAgendaDto {
  @ApiProperty({
    description: 'Ano letivo no formato de dois dígitos (ex: 25 para 2025/2026)',
    example: 21,
    minimum: 0,
    type: Number,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  anoLectivo: number;

  @ApiProperty({
    description: 'Código da Grade Curricular (ID da unidade curricular na grade)',
    example: 714,
    type: Number,
     required:false
  })
  @IsInt()
    @IsOptional()
  @Type(() => Number)
  gradeCurricular: number;

  @ApiProperty({
    description: 'Código do horário associado à turma/disciplina',
    example: 20505,
    type: Number,
     required:false
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  horario?: number;

  @ApiProperty({
    description: 'Semestre da disciplina',
    example: 2,
    enum: [1, 2],
    type: Number,
  })
  @IsInt()
    @IsOptional()
  @IsIn([1, 2])
  @Type(() => Number)
  semestre: number;

  @ApiProperty({
    description: 'Código da turma',
    example: 8,
    type: Number,
    required:false
  })
  @IsInt()
    @IsOptional()
  @Type(() => Number)
  turma: number;

  @ApiProperty({
    description: 'Código da grade curricular específica da turma (gradeCurricularTurma)',
    example: 15,
    type: Number,
     required:false
  })
  @IsInt()
    @IsOptional()
  @Type(() => Number)
  gradeCurricularTurma: number;

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
    limit?: number = 10;
}