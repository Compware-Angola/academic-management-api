import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ListarCadeirasMelhoriaDto {
  @ApiProperty({ example: 61610 })
  @Type(() => Number)
  @IsInt()
  codigoMatricula: number;

  @ApiProperty({ example: 23 })
  @Type(() => Number)
  @IsInt()
  anoAnterior: number;

  @ApiProperty({ example: 22 })
  @Type(() => Number)
  @IsInt()
  anoAnterior2: number;
}
