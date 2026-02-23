import { IsOptional, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class FetchServicosSolicDTO {

  @ApiPropertyOptional({
    description: 'Estado da solicitação (1 por padrão)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  estado_solicitacao?: number = 1;

  @ApiPropertyOptional({
    description: 'Código do ano lectivo',
    example: 23,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  codigo_ano_lectivo: number;
}
