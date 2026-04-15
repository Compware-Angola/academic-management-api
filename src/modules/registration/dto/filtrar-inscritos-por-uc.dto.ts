import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class FilterInscritosPorUcDto {
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
  anoCurricular?: number = 0;

  @ApiPropertyOptional({ example: 0, description: '0 = todos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semestre?: number = 0;

  @ApiPropertyOptional({ example: 0, description: '0 = todos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodo?: number = 0;

  @ApiPropertyOptional({ example: 0, description: '0 = todos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cadeira?: number = 0;

  @ApiPropertyOptional({ example: 0, description: '0 = todos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  horario?: number = 0;

  @ApiPropertyOptional({
    example: '0',
    description: '0 = todos, 1 = Em curso, 2 = Pendente',
  })
  @IsOptional()
  @IsString()
  estado?: string = '0';

  @ApiPropertyOptional({
    example: 'joao',
    description: 'Pesquisa por nome ou matrícula',
  })
  @IsOptional()
  @IsString()
  search?: string;
}