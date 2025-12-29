import { IsInt, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ViewMonthsDto {
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  anoLectivo: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return parseInt(value, 10);
  })
  @IsInt({ message: 'Semestre deve ser um número inteiro' })
  @Min(1, { message: 'Semestre não pode ser menor que 1' })
  semestre?: number;
}
