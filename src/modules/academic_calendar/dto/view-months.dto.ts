
import { IsInt, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ViewMonthsDto {
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  anoLectivo: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : parseInt(value, 10)))
  @IsInt({ message: 'semestre deve ser um número inteiro' })
  @Min(1)
  semestre?: number;
}