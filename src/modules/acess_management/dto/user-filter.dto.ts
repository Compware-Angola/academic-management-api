// src/users/dto/user-filter.dto.ts
import { IsOptional, IsBooleanString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';


export class UserFilterDto {
  @ApiPropertyOptional({ 
    description: 'Filtrar apenas ativos (true) ou inativos (false). Omitir = todos',
    example: 'true'
  })
  @IsOptional()
  @IsBooleanString()
  ativo?: string;  


    @ApiPropertyOptional({
      description: 'Número da página',
      example: 1,
      minimum: 1,
      default: 1,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;
  
    @ApiPropertyOptional({
      description: 'Quantidade de registros por página (máximo 100)',
      example: 25,
      minimum: 1,
      maximum: 100,
      default: 25,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number = 25;

  @ApiPropertyOptional({ 
    description: 'Termo de busca no nome ou email',
    example: 'joao'
  })
  @IsOptional()
  search?: string;
}