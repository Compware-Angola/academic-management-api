// src/users/dto/user-filter.dto.ts
import { IsOptional, IsBooleanString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UserFilterDto {
  @ApiPropertyOptional({ 
    description: 'Filtrar apenas ativos (true) ou inativos (false). Omitir = todos',
    example: 'true'
  })
  @IsOptional()
  @IsBooleanString()
  ativo?: string;   // 'true' | 'false' (string por causa do query param)
}