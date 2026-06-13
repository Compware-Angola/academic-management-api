import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class UpdateCurricularUnitFormulaDto {
  @ApiProperty({
    example: 10,
    minimum: 0,
    maximum: 20,
    description: 'Nota minima da componente pratica',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(20)
  minimumPracticalGrade: number;

  @ApiProperty({
    example: 30,
    minimum: 0,
    maximum: 100,
    description: 'Peso percentual da componente pratica',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  practicalWeight: number;

  @ApiProperty({
    example: 10,
    minimum: 0,
    maximum: 20,
    description: 'Nota minima da primeira frequencia',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(20)
  minimumFirstFrequencyGrade: number;

  @ApiProperty({
    example: 35,
    minimum: 0,
    maximum: 100,
    description: 'Peso percentual da primeira frequencia',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  firstFrequencyWeight: number;

  @ApiProperty({
    example: 10,
    minimum: 0,
    maximum: 20,
    description: 'Nota minima da segunda frequencia',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(20)
  minimumSecondFrequencyGrade: number;

  @ApiProperty({
    example: 35,
    minimum: 0,
    maximum: 100,
    description: 'Peso percentual da segunda frequencia',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  secondFrequencyWeight: number;
}
