import { IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Optional } from '@nestjs/common';

export class FindAcademicYearsDTO {
  @ApiProperty({
    description: 'Código do tipo de candidatura',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  tipoCandidatura?: number;

  @ApiPropertyOptional({
    description: 'Código do ano Lectivo',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  codigoAnoLectivo?: number;
}
