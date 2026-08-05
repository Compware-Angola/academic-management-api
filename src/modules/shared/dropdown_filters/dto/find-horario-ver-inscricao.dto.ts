// src/unidades-curriculares/dto/find-unidades-curriculares.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class FindHorarioVerInscricaoDTO {
  @ApiProperty({
    description: 'Código do curso',
    example: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  curso: number;

  @ApiProperty({
    description: 'Código da grade curricular',
    example: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  gradeCurricular: number;

  @ApiProperty({
    description: 'Código do ano lectivo (',
    example: 22,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  anoLectivo: number;
  @ApiPropertyOptional({
    description: 'Código do ano periodo',
    example: 22,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  periodo: number;
}
