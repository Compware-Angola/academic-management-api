// src/students/dto/inscricao-melhoria.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  ValidateNested,
} from 'class-validator';

class CadeiraMelhoriaDto {
  @ApiProperty({ example: 2416 })
  @Type(() => Number)
  @IsInt()
  codigoGrade: number;

  @ApiProperty({ example: 98765 })
  @Type(() => Number)
  @IsInt()
  codigoGradeAluno: number;
}

export class InscricaoMelhoriaDto {
  @ApiProperty({ example: 9426 })
  @Type(() => Number)
  @IsInt()
  codigoMatricula: number;

  @ApiProperty({ example: 23 })
  @Type(() => Number)
  @IsInt()
  anoLectivo: number;

  @ApiProperty({ type: [CadeiraMelhoriaDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CadeiraMelhoriaDto)
  cadeiras: CadeiraMelhoriaDto[];
}