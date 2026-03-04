import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSumarioDto {

  @ApiProperty({
    description: 'ID do Agendamento da Aula',
    example: 10,
  })
  @IsInt()
  @Type(() => Number)
  fk_agendamento_aula: number;

  @ApiProperty({
    description: 'ID do Estado do Sumário',
    example: 1,
  })
  @IsInt()
  @Type(() => Number)
  fk_estado_sumario: number;

  @ApiProperty({
    description: 'Descrição do sumário',
    example: 'Aula sobre introdução a bases de dados',
  })
  @IsString()
  @IsNotEmpty()
  descricao: string;


  @ApiProperty({
    description: 'Estado ativo (1 = ativo, 0 = inativo)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  active_state?: number;
}