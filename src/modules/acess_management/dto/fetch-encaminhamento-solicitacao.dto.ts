import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FetchEncaminhamentoSolicitacaoDTO {
  @ApiPropertyOptional({ description: 'Filtrar por serviço', example: 6435 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  serviceId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por estado específico',
    example: 'Solicitações Respondidas',
  })
  @IsOptional()
  estado?: string;

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
}
