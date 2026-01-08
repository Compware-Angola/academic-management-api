// filter-acesso.dto.ts
import { IsOptional, IsInt, IsBooleanString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FilterAcessoDto {
  @ApiPropertyOptional({ description: 'Filtrar por utilizador' })
  @IsOptional()
  @IsInt()
  utilizadorId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por grupo' })
  @IsOptional()
  @IsInt()
  grupoId?: number;

  @ApiPropertyOptional({
    description: 'Apenas acessos ativos (true por padrão)',
  })
  @IsOptional()
  @IsBooleanString()
  apenasAtivos?: string = 'true';
  @ApiPropertyOptional({
    description: 'Número da página',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página (máximo 100)',
    example: 25,
    minimum: 1,
    maximum: 100,
    default: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 25;
}
