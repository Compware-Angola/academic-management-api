import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdatePostGraduationVacancyDto {
  @ApiProperty({
    example: 35,
    description:
      'Novo total de vagas. Não pode ser inferior às vagas já ocupadas.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numberOfVacancies: number;
}
