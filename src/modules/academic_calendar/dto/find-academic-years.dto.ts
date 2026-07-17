import { IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Optional } from '@nestjs/common';

export class FindAcademicYearsDTO {
  @ApiProperty({
    description: 'Código do tipo de candidatura',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  tipoCandidatura: number;

  @ApiPropertyOptional({
    description: 'Código do ano Lectivo',
    example: 1,
  })
  @Optional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  codigoAnoLectivo?: number;

  @ApiPropertyOptional({
    description: 'Número da página',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}
