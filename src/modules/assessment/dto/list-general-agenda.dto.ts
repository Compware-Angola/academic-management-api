// src/oral/dto/listar-definir-oral.dto.ts
import { IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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
  @Type(() => Number)
  gradeCurricular: number;

  @ApiProperty({
    description: 'Código do horário associado à turma/disciplina',
    example: 20505,
    type: Number,
     required:false
  })
  @IsInt()
  @Type(() => Number)
  horario: number;

  @ApiProperty({
    description: 'Semestre da disciplina',
    example: 2,
    enum: [1, 2],
    type: Number,
  })
  @IsInt()
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
  @Type(() => Number)
  turma: number;

  @ApiProperty({
    description: 'Código da grade curricular específica da turma (gradeCurricularTurma)',
    example: 15,
    type: Number,
     required:false
  })
  @IsInt()
  @Type(() => Number)
  gradeCurricularTurma: number;
}