// src/grupos/dto/filter-grupo.dto.ts
import { IsOptional, IsBooleanString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterGrupoDto {
  @ApiPropertyOptional({
    description: 'Filtrar apenas grupos ativos (true) ou inativos (false). Omitir = todos',
    example: 'true',
  })
  @IsOptional()
  @IsBooleanString()
  ativo?: string;
}