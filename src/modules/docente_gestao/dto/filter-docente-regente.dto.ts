import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class FilterDocenteRegenteDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ example: 17, description: 'Código do ano lectivo' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ano_lectivo?: number;

  @ApiPropertyOptional({ example: 12, description: 'Código do curso' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  curso?: number;

  @ApiPropertyOptional({ example: 3, description: 'Código do ano curricular' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  classe?: number;

  @ApiPropertyOptional({ example: 1, description: 'Código do semestre' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semestre?: number;

  @ApiPropertyOptional({
    example: 0,
    description: '0 = todos, 1 = sem regente, 2 = com regente',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  estado?: number;

  @ApiPropertyOptional({
    example: 'Topografia',
    description: 'Pesquisa por docente, unidade curricular, semestre ou ano curricular',
  })
  @IsOptional()
  @IsString()
  search?: string;
}