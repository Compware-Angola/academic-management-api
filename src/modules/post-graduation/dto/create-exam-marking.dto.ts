import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsPositive,
  Matches,
} from 'class-validator';

export class CreateExamMarkingDto {
  @ApiProperty({ example: 2, enum: [2, 3] })
  @Type(() => Number)
  @IsInt()
  @IsIn([2, 3])
  degreeId: number;

  @ApiProperty({ example: 23 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  academicYearId: number;

  @ApiProperty({ example: 1, enum: [1, 2] })
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2])
  semesterId: number;

  @ApiProperty({ example: 21 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  courseId: number;

  @ApiProperty({
    example: 1107,
    description: 'Codigo da grade curricular, nao da disciplina isolada',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  curricularGradeId: number;

  @ApiProperty({ example: 222376 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  scheduleId: number;

  @ApiProperty({ example: 400 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  termId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  examTypeId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  modalityId: number;

  @ApiProperty({ example: 204 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  roomId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  periodId: number;

  @ApiProperty({ example: '2026-07-20' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  examDate: string;

  @ApiProperty({ example: '10:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime: string;

  @ApiProperty({ example: '12:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime: string;

  @ApiProperty({
    example: [1965, 2435],
    description: 'Zero, um ou no maximo dois utilizadores docentes distintos',
    type: [Number],
  })
  @IsArray()
  @ArrayMaxSize(2)
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  invigilatorUserIds: number[];
}
