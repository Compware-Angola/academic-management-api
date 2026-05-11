import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class IsentarColisaoMatriculaLegadoDto {
  @ApiProperty({ example: 12345 })
  @Type(() => Number)
  @IsInt()
  matricula: number;
}
