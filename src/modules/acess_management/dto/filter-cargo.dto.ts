import { IsOptional, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterCargoDto {
  @ApiPropertyOptional({ description: 'Filtrar por tipo de cargo (0 = todos)' })
  @IsOptional()
  @IsInt()
  tipoCargoId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por utilizador específico' })
  @IsOptional()
  @IsInt()
  utilizadorId?: number;
}