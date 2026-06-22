import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsPositive } from 'class-validator';

export class FindAgendaValidationOptionsDto {
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

  @ApiPropertyOptional({
    example: 21,
    description: 'Codigo do curso coordenado pelo utilizador',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  courseId?: number;
}
