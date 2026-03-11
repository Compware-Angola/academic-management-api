import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Min,
  Max,
  IsString,
  MaxLength,
} from 'class-validator';

export class FindParametrosDocenteTO {
  @ApiPropertyOptional({
    description: 'Filtro por designação ou sigla do parâmetro',
    example: 'contrato',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

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