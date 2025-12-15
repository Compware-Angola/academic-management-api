import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Matches } from 'class-validator';

export class SearchAvailableRoomsDto {
  @ApiProperty({
    description: 'ID do Ano Lectivo',
    example: 18,
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  anoLectivo: number;

  @ApiProperty({
    description: 'ID do Dia da Semana (1 = Segunda, 2 = Terça, ...)',
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  diaSemana: number;

  @ApiProperty({
    description: 'ID do Tipo de Aula',
    example: 5,
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  tipoAula: number;

  @ApiProperty({
    description: 'Hora inicial do intervalo (formato HH:mm)',
    example: '10:00',
    pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'horaInicio deve estar no formato HH:mm',
  })
  horaInicio: string;

  @ApiProperty({
    description: 'Hora final do intervalo (formato HH:mm)',
    example: '12:00',
    pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'horaFim deve estar no formato HH:mm',
  })
  horaFim: string;
}
