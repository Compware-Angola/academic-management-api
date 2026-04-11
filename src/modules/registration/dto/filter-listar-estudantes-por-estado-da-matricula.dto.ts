import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class FilterListarEstudantesPorEstadoMatriculaDto {
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

  @ApiPropertyOptional({ example: 0, description: '0 = todos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anoLectivo?: number = 0;

  @ApiPropertyOptional({ example: 0, description: '0 = todos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  curso?: number = 0;

  @ApiPropertyOptional({ example: 0, description: '0 = todos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  turno?: number = 0;

  @ApiPropertyOptional({ example: 0, description: '0 = todos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  estado?: number = 0;

  @ApiPropertyOptional({ example: 0, description: '0 = todos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anoCurricular?: number = 0;

  @ApiPropertyOptional({
    example: 'joao',
    description: 'Pesquisar por matrícula, nome, telefone, email, curso ou estado',
  })
  @IsOptional()
  @IsString()
  search?: string;
}