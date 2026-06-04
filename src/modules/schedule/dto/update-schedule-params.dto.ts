import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

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
    example: 'ipp',
  })
  @IsOptional()
  @IsString()
  sigla?: string;

  @ApiPropertyOptional({
    description: `Argumentos do parâmetro.
    - IPP:  array de { periodo, hora_inicio (HH:MM), qtd_de_tempo }
    - DTL:  array de { curso, duracao (HH:MM) }
    - IETL: array de { curso, seq: [{ duracao (HH:MM) }] }`,
    examples: {
      ipp: {
        summary: 'IPP',
        value: [
          { periodo: 1, hora_inicio: '07:20', qtd_de_tempo: 6 },
          { periodo: 0, hora_inicio: '07:20', qtd_de_tempo: 6 },
        ],
      },
      dtl: {
        summary: 'DTL',
        value: [{ curso: 0, duracao: '01:30' }],
      },
      ietl: {
        summary: 'IETL',
        value: [{ curso: 0, seq: [{ duracao: '00:10' }] }],
      },
    },
  })
  @IsOptional()
  @ValidateIf((o) => o.args !== undefined)
  args?: Record<string, unknown>[] | Record<string, unknown> | string;

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
  @Type(() => Number)
  ordem?: number;

  @ApiPropertyOptional({
    description: 'Estado ativo (1 = ativo, 0 = inativo)',
    example: 1,
    enum: [0, 1],
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  active_state?: number;
}