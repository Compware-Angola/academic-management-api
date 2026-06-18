import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateAgendaLaunchDto {
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

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  curricularYearId: number;

  @ApiProperty({
    example: 1107,
    description: 'Codigo da grade curricular, nao da disciplina isolada',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  curricularGradeId: number;

  @ApiProperty({ example: 425, description: 'Codigo do prazo institucional' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  termId: number;

  @ApiProperty({ example: 1, description: 'Codigo do tipo de avaliacao' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  assessmentTypeId: number;

  @ApiProperty({ example: 'pauta-uc-1107.pdf' })
  @Transform((params: TransformFnParams) => {
    const value: unknown = params.value;
    return typeof value === 'string' ? value.trim() : value;
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^(?!.*\.\.)(?!.*[\\/])[\s\S]+\.pdf$/i, {
    message: 'fileName deve conter apenas o nome de um ficheiro PDF valido',
  })
  fileName: string;
}
