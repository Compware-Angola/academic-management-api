import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class FindPostGraduationVacanciesDto {
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

  @ApiPropertyOptional({ example: 21, description: 'Código do curso' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  courseId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Código do período' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  periodId?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
