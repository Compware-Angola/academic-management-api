// filter-acesso.dto.ts
import { IsOptional, IsInt, IsBooleanString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterAcessoDto {
  @ApiPropertyOptional({ description: 'Filtrar por utilizador' })
  @IsOptional()
  @IsInt()
  utilizadorId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por grupo' })
  @IsOptional()
  @IsInt()
  grupoId?: number;

  @ApiPropertyOptional({ description: 'Apenas acessos ativos (true por padrão)' })
  @IsOptional()
  @IsBooleanString()
  apenasAtivos?: string = 'true';
}
