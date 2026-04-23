import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterTipoPerguntaDto {
  @ApiPropertyOptional({
    description: 'Designação do tipo de pergunta para filtrar',
    example: 'Múltipla',
  })
  @IsOptional()
  @IsString()
  designacao?: string;

  @ApiPropertyOptional({
    description: 'Código do tipo de pergunta',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  codigo?: number;

  @ApiPropertyOptional({
    description: 'Número da página (inicia em 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
