import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class FindPostGraduationAttendanceTeachersDto {
  @ApiPropertyOptional({
    description: 'Grau: 2 = Mestrado, 3 = Doutoramento',
    enum: [2, 3],
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([2, 3])
  degreeId?: number;

  @ApiPropertyOptional({ description: 'Codigo do ano lectivo' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anoLectivo?: number;

  @ApiPropertyOptional({ description: 'Codigo do semestre' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semestre?: number;

  @ApiPropertyOptional({
    description: 'Pesquisa por nome, email, username ou numero mecanografico',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }: TransformFnParams): string | undefined => {
    const search: unknown = value;
    return typeof search === 'string' ? search.trim() || undefined : undefined;
  })
  search?: string;
}
