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
    description: 'Periodo',
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  periodo: number;

  @ApiProperty({
    description: 'ID do Tipo de Aula',
    example: 5,
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  tipoAula: number;

}
