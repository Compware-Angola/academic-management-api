import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpsertPostGraduationNoteItemDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  studentCurricularGradeId: number;

  @ApiProperty({ minimum: 0, maximum: 20 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(20)
  grade: number;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observation?: string;
}

export class UpsertPostGraduationNotesDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  academicYearId: number;

  @Type(() => Number)
  @IsInt()
  @IsIn([2, 3])
  degreeId: number;

  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2])
  semesterId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  periodId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  courseId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  curricularYearId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  curricularGradeId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  scheduleId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  examTypeId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  assessmentTypeId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  termId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => UpsertPostGraduationNoteItemDto)
  items: UpsertPostGraduationNoteItemDto[];
}