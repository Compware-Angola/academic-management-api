import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterProvaHoraDto {
  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @Type(() => Number)
    @IsOptional()
  codigoAnoLetivo?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoCurso?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoTurno?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}
