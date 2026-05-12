import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class IsentarColisaoCursoLegadoDto {
  @ApiProperty({ example: 404 })
  @Type(() => Number)
  @IsInt()
  curso: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  turno: number;
}
