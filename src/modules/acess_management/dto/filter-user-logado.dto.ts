// filter-acesso.dto.ts
import { IsOptional, IsInt, IsBooleanString, Min, Max, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FilterUserLogadoDto {
@ApiPropertyOptional({
    description: 'Mostrar apenas acessos logados (true/false/todos)',
    enum: [1, 0],
    default: 1,
    example: 1,
  })
    @Type(() => Number)
  @IsOptional()
 
  estado?: number;

  @ApiPropertyOptional({
    description: 'Pesquisa por nome, username, email ou IP',
    example: 'maria',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Página', example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Limite por página (máx 100)',
    example: 25,
    default: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 25;
}
