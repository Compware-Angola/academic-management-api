// src/students/dto/listar-diplomados.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class ListarDiplomadosDTO {
  @ApiProperty({ example: 23 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  anoLectivo: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  codigoCurso?: number;

  @ApiPropertyOptional({ example: 'todos' })
  @IsOptional()
  @IsString()
  genero?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  tipoCandidatura?: number;

@ApiPropertyOptional()
@Transform(({ value }) => Number(value))
@IsOptional()
@IsInt()
page?: number;

@ApiPropertyOptional()
@Transform(({ value }) => Number(value))
@IsOptional()
@IsInt()
limit?: number;
}