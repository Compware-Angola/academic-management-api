// src/oral/dto/listar-definir-oral.dto.ts
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ListarDefinirOralDto {
  @ApiProperty({
    description: 'Ano letivo (últimos 2 dígitos, ex: 23 = 2023/2024)',
    example: 23,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  anoLectivo: number;
  @ApiProperty({ example: 5, description: 'Código do curso' })
  @IsInt()
  @Type(() => Number)
  cursoId: number;

  @ApiProperty({ example: 2, description: 'Ano curricular / classe' })
  @IsInt()
  @Type(() => Number)
  anoCurricular: number;

  @ApiProperty({ example: 1, description: 'Semestre (1 ou 2)' })
  @IsOptional()
  @Type(() => Number)
  semestre?: number;
}