import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class FindStudentCurriculumQueryDTO {
  @Type(() => Number)
  @IsInt()
  academicYearCode: number;

  @Type(() => Number)
  @IsInt()
  enrollmentCode: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semestre?: number;
}

export interface FindCurriculumParams {
  academicYearCode: number;
  enrollmentCode: number;
  semester?: number;
}

export interface StudentCurriculumGradeRow {
  disciplina: string;
  semestre: string;
  classe: string;
  nota: number;
  estado: string;
  duracaoDisciplina: string;
  CodigoDisciplina: number;
  CodigoGrade: number;
  ValorInscricao: number;
  ano_lectivo: string;
}

export interface FindCurriculumParams {
  academicYearCode: number;
  enrollmentCode: number;
  semester?: number;
}
