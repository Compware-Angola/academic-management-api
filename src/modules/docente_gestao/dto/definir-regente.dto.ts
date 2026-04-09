import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class DefinirRegenteDto {
  @ApiProperty({ example: 17 })
  @Type(() => Number)
  @IsInt()
  anoLectivo: number;

  @ApiProperty({ example: 380 })
  @Type(() => Number)
  @IsInt()
  gradeCurricular: number;

  @ApiProperty({ example: 77 })
  @Type(() => Number)
  @IsInt()
  docente: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  semestre: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  createdBy: number;
}