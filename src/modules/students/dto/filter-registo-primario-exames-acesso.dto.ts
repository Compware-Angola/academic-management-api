import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class FilterRegistoPrimarioExamesAcessoDto {
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
  grau?: number = 0;

  @ApiPropertyOptional({
    example: 'maria',
    description: 'Pesquisar por nome ou nº bilhete',
  })
  @IsOptional()
  @IsString()
  search?: string;
}