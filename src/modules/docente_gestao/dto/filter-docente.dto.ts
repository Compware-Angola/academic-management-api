// filter-docente.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class FilterDocenteDto {
  @ApiPropertyOptional({
    description: 'Número da página',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({
    description: 'Quantidade de registos por página',
    example: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Código da área de formação. Use 0 ou omita para listar todas.',
    example: 155,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  area?: number;

  @ApiPropertyOptional({
    description: 'Texto para pesquisa por nome, email, categoria, escalão, grau académico ou número mecanográfico',
    example: 'Pedro',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
