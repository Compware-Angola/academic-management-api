import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsPositive } from 'class-validator';

export class FindOralCurricularUnitsDto {
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
    description: 'Grau da Pos-Graduacao: 2 = Mestrado, 3 = Doutoramento',
    enum: [2, 3],
  })
  @Type(() => Number)
  @IsInt()
  @IsIn([2, 3])
  degreeId: number;

  @ApiProperty({
    example: 13,
    description: 'Codigo do curso de Pos-Graduacao',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  courseId: number;

  @ApiProperty({
    example: 1,
    description: 'Codigo do ano curricular',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  curricularYearId: number;

  @ApiProperty({
    example: 1,
    description: 'Codigo do semestre',
    enum: [1, 2],
  })
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2])
  semesterId: number;
}
