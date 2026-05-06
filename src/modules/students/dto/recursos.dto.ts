import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class FindCadeirasRecursoDto {
  @ApiProperty({ description: 'Ano letivo', example: 22 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  codigoAnoLectivo: number;

  @ApiProperty({ description: 'Código da matrícula', example: 48030 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  codigoMatricula: number;
}

export class FindCadeirasEpocaEspecialDto {
  @ApiProperty({ description: 'Ano letivo', example: 22 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  codigoAnoLectivo: number;

  @ApiProperty({ description: 'Código da matrícula', example: 22 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  codigoMatricula: number;
}

export class GradeRecursoAluno {
  @ApiProperty({
    description: 'Código da grade curricular do aluno',
    example: 1328779,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  codigoGradeAluno: number;

  @ApiProperty({
    description: 'Código da matrícula',
    example: 48030,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  codigoGrade: number;

  @ApiProperty({
    description: 'Unidade curricular',
    example: 'Algoritmos',
  })
  @IsNotEmpty()
  @IsString()
  unidadeCurricular: string;
}

export class InscricaoDTO {
  @ApiProperty({
    description: 'Código da grade curricular do aluno',
    example: [
      {
        codigoGradeAluno: 1328779,
        codigoGrade: 48030,
        unidadeCurricular: 'Algoritmos',
      },
      {
        codigoGradeAluno: 1466070,
        codigoGrade: 48030,
        unidadeCurricular: 'Algoritmos',
      },
    ],
  })
  @IsNotEmpty()
  @IsArray()
  @Type(() => GradeRecursoAluno)
  gradesAlunos: GradeRecursoAluno[];

  @ApiProperty({ description: 'Código da matrícula', example: 48030 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  codigoMatricula: number;
}

export class CriarInscricaoRecursoBodyDTO extends OmitType(InscricaoDTO, [
  'codigoMatricula',
] as const) {}
export class CriarInscricaoEpocaEspecialBodyDTO extends OmitType(InscricaoDTO, [
  'codigoMatricula',
] as const) {}
