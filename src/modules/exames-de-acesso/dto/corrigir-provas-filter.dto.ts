import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CorrigirProvasFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  codigoAnoLetivo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  codigoCurso?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoTurno?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  codigoFaculdade?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  codigoSala?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  dataInicio?: string; // 'YYYY-MM-DD'

  @IsOptional()
  @IsString()
  dataFim?: string; // 'YYYY-MM-DD'
}
