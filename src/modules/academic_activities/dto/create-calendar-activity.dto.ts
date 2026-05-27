import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateCalendarActivityDto {
  @ApiProperty({
    description: 'Designação da atividade lectiva',
    example: 'Inscrições para exames',
  })
  @IsString()
  @IsNotEmpty()
  designacao: string;

  @ApiProperty({
    description: 'Código do ano lectivo ativo',
    example: 23,
  })
  @IsInt()
  @IsNotEmpty()
  codigo_ano_lectivo: number;

  @ApiProperty({
    description: 'Código do tipo de candidatura',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  codigo_tipo_candidatura: number;

  @ApiProperty({
    description: 'Código do tipo de calendário',
    example: 16,
  })
  @IsInt()
  @IsNotEmpty()
  codigo_tipo_calendario: number;

  @ApiProperty({
    description: 'Data de início no formato ISO',
    example: '2026-05-01',
  })
  @IsDateString()
  @IsNotEmpty()
  data_inicio: string;

  @ApiProperty({
    description: 'Data de fim no formato ISO',
    example: '2026-05-30',
  })
  @IsDateString()
  @IsNotEmpty()
  data_fim: string;
}
