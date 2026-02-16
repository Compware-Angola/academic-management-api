import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested, IsArray } from 'class-validator';

export class MesItemDTO {
  @ApiProperty({ example: 'SET-2025' })
  @IsString()
  @IsNotEmpty()
  designacao: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  isencao: number;

  @ApiProperty({ example: 9 })
  @IsInt()
  ordem_mes: number;

  @ApiProperty({ example: 22 })
  @IsInt()
  ano_lectivo: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  prestacao: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  activo: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  activo_posgraduacao: number;

  @ApiProperty({ example: '2025-09-15' })
  @IsDateString()
  data_limite: string;

  @ApiProperty({ example: '2025-09-01' })
  @IsDateString()
  data_inicial: string;

  @ApiProperty({ example: '2025-09-30' })
  @IsDateString()
  data_final: string;

  @ApiProperty({ example: null, required: false })
  @IsOptional()
  @IsDateString()
  data_final_desconto?: string | null;

  @ApiProperty({ example: 2 })
  @IsInt()
  semestre: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  semestre_posgraduacao: number;
}
export class CreateMesTempDTO {
  @ApiProperty({
    description: 'Lista de meses',
    type: [MesItemDTO],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MesItemDTO)
  meses: MesItemDTO[];
}
