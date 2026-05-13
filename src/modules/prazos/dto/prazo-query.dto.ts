import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { TipoCalendario } from '../utils/tipo-calendario.enum';

export class PrazoQueryDto {
  @ApiProperty({
    enum: TipoCalendario,
    example: TipoCalendario.RECURSO,
    description: 'Tipo de calendário académico',
  })
  @IsEnum(TipoCalendario)
  tipo: TipoCalendario;

  @ApiPropertyOptional({
    example: 23,
    description: 'Ano lectivo (opcional). Se não for enviado, usa o atual.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anoLectivo?: number;
}
