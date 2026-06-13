import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class FindExamMarkingsDto {
  @ApiProperty({
    example: 23,
    description: 'Codigo do ano lectivo',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
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

  @ApiProperty({
    example: 1,
    description: 'Codigo do semestre',
    enum: [1, 2],
  })
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2])
  semesterId: number;

  @ApiPropertyOptional({ example: 21 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  courseId?: number;

  @ApiPropertyOptional({ example: 400 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  termId?: number;

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
