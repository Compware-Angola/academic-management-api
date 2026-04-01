import { IsOptional, IsNumber, Min, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterCandidatoDto {
  @ApiPropertyOptional({ description: 'Busca por nome ou documento' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ description: 'Código do ano letivo' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoAnoLetivo?: number;

  @ApiPropertyOptional({ description: 'Código da faculdade' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoFaculdade?: number;

  @ApiPropertyOptional({ description: 'Código do curso' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoCurso?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoCandidato?: number;

  @ApiPropertyOptional({ description: 'Código do turno' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoTurno?: number;

  @ApiPropertyOptional({ description: 'Página', default: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => (value ? Number(value) : 1))
  page?: number;

  @ApiPropertyOptional({
    description: 'Itens por página',
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => (value ? Number(value) : 10))
  limit?: number;
}