import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class IsentarColisaoCursoDto {
  @ApiProperty({ example: 404 })
  @Type(() => Number)
  @IsInt()
  curso: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  turno: number;

  @ApiProperty({ example: 17 })
  @Type(() => Number)
  @IsInt()
  anoLectivo: number;
}