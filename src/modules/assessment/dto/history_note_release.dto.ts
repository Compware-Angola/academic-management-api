

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class HistoryNoteReleaseDto {
  @ApiProperty({
    description: 'Código do ano letivo (obrigatório se não informar codigo_grade_curricular_aluno)',
    example: 22,
    type: Number,
    minimum: 1,
    required: false, // explicitamente opcional
  })
  @IsOptional() // <-- Este é o decorator correto
  @IsInt({ message: 'codigoAnoLectivo deve ser um número inteiro' })
  @IsPositive({ message: 'codigoAnoLectivo deve ser positivo' })
  @Transform(({ value }) => Number(value))
  codigoAnoLectivo?: number;

  @ApiProperty({
    description: 'Código da matrícula do aluno (obrigatório se não informar codigo_grade_curricular_aluno)',
    example: 54312,
    type: Number,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'codigoMatricula deve ser um número inteiro' })
  @IsPositive({ message: 'codigoMatricula deve ser positivo' })
  @Transform(({ value }) => Number(value))
  codigoMatricula?: number;

  @ApiProperty({
    description: 'Código da inscrição na disciplina (se informado, ignora os outros filtros e retorna apenas dessa disciplina)',
    example: 1336896,
    type: Number,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'codigo_grade_curricular_aluno deve ser um número inteiro' })
  @IsPositive({ message: 'codigo_grade_curricular_aluno deve ser positivo' })
  @Transform(({ value }) => Number(value))
  codigo_grade_curricular_aluno?: number;
}