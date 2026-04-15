import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class FilterListarColisoesIsentasPorMatriculaDto {
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

  @ApiPropertyOptional({
    example: '12345 ou João',
    description: 'Pesquisar por matrícula ou nome',
  })
  @IsOptional()
  @IsString()
  search?: string;
}