import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePlanoGradeExtrasDto {
  @IsOptional()
  @IsBoolean()
  temOral?: boolean;

  @IsOptional()
  @IsBoolean()
  temPratica?: boolean;
}
