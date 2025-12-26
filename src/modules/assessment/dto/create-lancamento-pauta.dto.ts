// src/modules/assessment/dto/create-lancamento-pauta.dto.ts

import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLancamentoPautaDto {
  @ApiProperty({
    description: 'ID do ano letivo',
    example: 22,
    type: Number,
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  anoLectivoId: number;

  @ApiProperty({
    description: 'ID do docente',
    example: 123,
    type: Number,
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  docenteId: number;
  @ApiProperty({
    description: 'ID da grade curricular',
    example: 80,
    type: Number,
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  gradeCurricularId: number;

  @ApiProperty({
    description: 'ID do estado do lançamento de pauta',
    example: 1,
    type: Number,
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  fkEstadoLancamentoPauta: number;

  @ApiProperty({
    description: 'ID do tipo de avaliação',
    example: 2,
    type: Number,
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  fkTipoAvaliacao: number;



  @ApiProperty({
    description: 'Nome do ficheiro anexado (ex: pauta.pdf)',
    example: 'pauta_final_semestre2.pdf',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString()
  ficheiroName?: string;
}