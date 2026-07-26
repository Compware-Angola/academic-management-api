// src/docentes/dto/find-docentes.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class FindDocentesDTO {
  @ApiPropertyOptional({
    description: 'Filtrar docentes por nome (pesquisa parcial)',
    example: 'João',
  })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiPropertyOptional({
    description: 'Tipo de Candidatura',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  tipoCandidatura?: number;
}
