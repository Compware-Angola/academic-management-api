import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, IsString, Min, Max, } from 'class-validator';

export class FilterTipoSuporteDto {
  @ApiPropertyOptional({
    description: 'Número da página (começa em 1)',
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
    description: 'Quantidade de registos por página (máx. 100)',
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

  @ApiPropertyOptional({
    description: 'Pesquisa por descrição (parcial, case-insensitive)',
    example: 'dúvida',
  })
  @IsOptional()
  @IsString()
  search?: string;
}