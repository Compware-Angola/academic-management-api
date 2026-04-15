import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class FilterRegistoPrimarioMatriculadosDto {
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

  @ApiPropertyOptional({ example: 0, description: '0 = todos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anoCurricular?: number = 0;

  @ApiPropertyOptional({
    example: 2,
    description: '0 = antigos, 1 = novos, 2 = todos',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  estado?: number = 2;

  @ApiPropertyOptional({
      example: 'Margarida',
      description: 'Pesquisa por nome ou nº bilhete, faculdade',
    })
    @IsOptional()
    @IsString()
    search?: string;
}