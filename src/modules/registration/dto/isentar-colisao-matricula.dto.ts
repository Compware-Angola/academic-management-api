import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class IsentarColisaoMatriculaDto {
  @ApiProperty({ example: 12345 })
  @Type(() => Number)
  @IsInt()
  matricula: number;

  @ApiProperty({ example: 17 })
  @Type(() => Number)
  @IsInt()
  anoLectivo: number;
}