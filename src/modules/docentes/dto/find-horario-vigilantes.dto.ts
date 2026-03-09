import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, IsPositive, Max } from 'class-validator';

export class FindHorarioVigilantesCDTO {
  @ApiProperty({
    description: 'Id do Vigilante',
    example: 653,
    minimum: 1,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  vigilanteId: number;
  @ApiProperty({
    description: 'Id do Prazo',
    example: 32,
    minimum: 1,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  prazoId: number;

  @ApiPropertyOptional({
    description: 'Id do Periodo',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  periodoId?: number;

  @ApiPropertyOptional({
    description: 'Estado do Agendamento',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  estado: number;

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
