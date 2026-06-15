import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class FindAttendanceListDto {
  @ApiProperty({ example: 23, description: 'Codigo do ano lectivo' })
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

  @ApiProperty({ example: 6, description: 'Codigo do periodo' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  periodId: number;

  @ApiProperty({ example: 21, description: 'Codigo do curso' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  courseId: number;

  @ApiProperty({ example: 2, description: 'Codigo do ano curricular' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  curricularYearId: number;

  @ApiProperty({
    example: 1107,
    description: 'Codigo da grade curricular da Unidade Curricular',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  curricularGradeId: number;

  @ApiProperty({ example: 222376, description: 'Codigo do horario' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  scheduleId: number;

  @ApiPropertyOptional({
    example: '40014',
    description: 'Pesquisa pelo codigo da matricula ou nome do estudante',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }: TransformFnParams): string | undefined => {
    const search: unknown = value;
    return typeof search === 'string' ? search.trim() || undefined : undefined;
  })
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
