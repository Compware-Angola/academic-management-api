import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';

export class CreatePostGraduationVacancyDto {
  @ApiProperty({ example: 23, description: 'Código do ano lectivo' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  academicYearId: number;

  @ApiProperty({
    example: 2,
    description: 'Grau: 2 = Mestrado, 3 = Doutoramento',
    enum: [2, 3],
  })
  @Type(() => Number)
  @IsInt()
  @IsIn([2, 3])
  degreeId: number;

  @ApiProperty({ example: 21, description: 'Código do curso' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  courseId: number;

  @ApiProperty({ example: 1, description: 'Código do período' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  periodId: number;

  @ApiProperty({ example: 30, description: 'Número total de vagas' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numberOfVacancies: number;
}
