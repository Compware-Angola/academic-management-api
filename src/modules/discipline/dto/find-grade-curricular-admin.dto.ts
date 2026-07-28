// dto/find-grade-curricular-admin.dto.ts
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class FindGradeCurricularAdminDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  curso?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classe?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semestre?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  disciplina?: number;

  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1])
  estado?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit?: number = 25;
}
