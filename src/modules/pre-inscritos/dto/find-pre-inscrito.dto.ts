import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class FindPreInscritoDto {
  @ApiPropertyOptional({
    required: false,
    default: 1,
    type: 'number',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    required: false,
    default: 10,
    type: 'number',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    required: false,
    type: 'string',
    description: 'Pesquisa por nome, e-mail, telefone ou número de documento',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    required: false,
    type: 'string',
    description: 'Filtro por tipo de candidatura (grau académico)',
  })
  @IsOptional()
  @IsString()
  grauacademico?: string;

  @ApiPropertyOptional({
    required: false,
    type: 'number',
    description: 'Filtro por tipo de documento',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  @IsNumber()
  @Type(() => Number)
  tipoDocumento?: number;

  @ApiPropertyOptional({
    required: false,
    type: 'number',
    description: 'Filtro por ano lectivo (ID)',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  @IsNumber()
  @Type(() => Number)
  anoLectivoId?: number;
}
