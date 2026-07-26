// src/unidades-curriculares/dto/find-unidades-curriculares.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class FindUnidadesCurricularesDTO {
  @ApiPropertyOptional({
    description: 'Código do curso',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  curso?: number;

  @ApiPropertyOptional({
    description: 'Código do semestre',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  semestre?: number;

  @ApiPropertyOptional({
    description: 'Código da classe',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  classe?: number;

  @ApiPropertyOptional({
    description: 'Código do ano lectivo (ignorado se for 23 ou não informado)',
    example: 22,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  anoLectivo?: number;
}
