import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';

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

  @ApiPropertyOptional({
    example: 1,
    description: 'Código do tipo de candidatura.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  codigo_tipo_candidatura?: number;
}

export class PrazoQueryWithoutTipoCalendario extends OmitType(PrazoQueryDto, [
  'tipo',
]) {}
