import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class FilterListarColisoesIsentasPorCursoDto {
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

  @ApiPropertyOptional({ example: 17, description: '0 = todos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anoLectivo?: number = 0;

  @ApiPropertyOptional({ example: 404, description: '0 = todos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  curso?: number = 0;

  @ApiPropertyOptional({ example: 5, description: '0 = todos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  turno?: number = 0;
}