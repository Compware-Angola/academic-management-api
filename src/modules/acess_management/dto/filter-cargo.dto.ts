import { IsOptional, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FilterCargoDto {
  @ApiPropertyOptional({ description: 'Filtrar por tipo de cargo (0 = todos)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tipoCargoId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por utilizador específico' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  utilizadorId?: number;
}
