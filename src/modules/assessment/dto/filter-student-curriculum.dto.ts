// filter-curriculum-grade-aluno.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class FilterCurriculumGradeAlunoDto {
  @ApiProperty({
    description: 'Código do ano letivo',
    example: 22,
    type: Number,
    minimum: 1,
  })
  @IsNumber({}, { message: 'codigoAnoLectivo deve ser um número' })
  @IsNotEmpty({ message: 'codigoAnoLectivo é obrigatório' })
  @IsInt({ message: 'codigoAnoLectivo deve ser um número inteiro' })
  @IsPositive({ message: 'codigoAnoLectivo deve ser positivo' })
  @Transform(({ value }) => Number(value))
  codigoAnoLectivo: number;

  @ApiProperty({
    description: 'Código da matrícula do aluno',
    example: 54312,
    type: Number,
    minimum: 1,
  })
  @IsNumber({}, { message: 'codigoMatricula deve ser um número' })
  @IsNotEmpty({ message: 'codigoMatricula é obrigatório' })
  @IsInt({ message: 'codigoMatricula deve ser um número inteiro' })
  @IsPositive({ message: 'codigoMatricula deve ser positivo' })
  @Transform(({ value }) => Number(value))
  codigoMatricula: number;
}