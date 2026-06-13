import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';

export class FindExamCalendarsDto {
  @ApiProperty({
    example: 23,
    description: 'Codigo do ano lectivo',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
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
}
