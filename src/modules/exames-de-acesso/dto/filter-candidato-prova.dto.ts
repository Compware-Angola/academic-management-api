import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterCandidatoProvaDto {
  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  codigoAnoLetivo?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoSala?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoCurso?: number;

  @ApiPropertyOptional({
    description: 'Formato dd/mm/yyyy (converte para mm/dd/yyyy interno)',
    example: '19/02/2020',
  })
  @IsOptional()
  @IsString()
  dataRealizacao?: string;

  @ApiPropertyOptional({
    description: 'Formato hh:mm:ss (converte para nanosegundos)',
    example: '14:30:00',
  })
  @IsOptional()
  @IsString()
  horaInicio?: string;

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
