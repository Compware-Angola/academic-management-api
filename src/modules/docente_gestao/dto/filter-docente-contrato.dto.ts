import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class FilterDocenteContratoDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 0,
    description: 'Curso/ campo de formação. 0 = todos',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  curso?: number = 0;

  @ApiPropertyOptional({
    example: 0,
    description: 'Grau académico. 0 = todos',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  grau?: number = 0;

  @ApiPropertyOptional({
    example: 0,
    description: 'Género. 0 = todos',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  genero?: number = 0;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Data inicial da candidatura',
  })
  @IsOptional()
  @IsString()
  data_inicio?: string;

  @ApiPropertyOptional({
    example: '2026-03-26',
    description: 'Data final da candidatura',
  })
  @IsOptional()
  @IsString()
  data_fim?: string;

  @ApiPropertyOptional({
    example: 'joaquim',
    description: 'Pesquisa por nome ou email',
  })
  @IsOptional()
  @IsString()
  search?: string;
}