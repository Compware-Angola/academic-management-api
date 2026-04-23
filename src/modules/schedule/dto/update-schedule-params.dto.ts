import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsObject,
} from 'class-validator';

export class UpdateScheduleParamDto {
  @ApiProperty({
    description: 'Chave primária do parâmetro',
    example: 1,
  })
  @IsNumber()
  pk_parametro: number;

  @ApiPropertyOptional({
    description: 'Designação do parâmetro',
    example: 'Parâmetro de Horário',
  })
  @IsOptional()
  @IsString()
  designacao?: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada',
    example: 'Define regras de horário',
  })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({
    description: 'Sigla do parâmetro',
    example: 'PH',
  })
  @IsOptional()
  @IsString()
  sigla?: string;

  @ApiPropertyOptional({
    description: 'Argumentos adicionais (objeto ou string)',
    example: { tempoMax: 60 },
  })
  @IsOptional()
  args?: Record<string, unknown> | string;

  @ApiPropertyOptional({
    description: 'Observações',
    example: 'Atualizado manualmente',
  })
  @IsOptional()
  @IsString()
  obs?: string;

  @ApiPropertyOptional({
    description: 'Ordem de exibição',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  ordem?: number;

  @ApiPropertyOptional({
    description: 'Estado ativo (1 = ativo, 0 = inativo)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  active_state?: number;


}