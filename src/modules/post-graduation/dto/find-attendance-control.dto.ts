import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class FindPostGraduationAttendanceControlDto {
  @ApiPropertyOptional({
    description: 'Grau: 2 = Mestrado, 3 = Doutoramento',
    enum: [2, 3],
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([2, 3])
  degreeId?: number;

  @ApiPropertyOptional({ description: 'Codigo do docente' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  docente?: number;

  @ApiProperty({
    description: 'Data inicial do intervalo',
    example: '2026-01-02',
    type: String,
    format: 'date',
  })
  @IsNotEmpty()
  @Type(() => Date)
  dataInicial: Date;

  @ApiProperty({
    description: 'Data final do intervalo',
    example: '2026-05-02',
    type: String,
    format: 'date',
  })
  @IsNotEmpty()
  @Type(() => Date)
  dataFinal: Date;

  @ApiPropertyOptional({ description: 'Estado da aula' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  estado?: number;

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

  @ApiPropertyOptional({ description: 'Codigo do curso' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  curso?: number;

  @ApiPropertyOptional({ description: 'Codigo da grade curricular' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  gradeCurricular?: number;

  @ApiPropertyOptional({
    description: 'Pesquisa por codigo, docente, curso ou unidade curricular',
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

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
