import { IsOptional, IsNumber, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterCandidatoDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoAnoLetivo?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoFaculdade?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoCurso?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoCandidato?: number;

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
