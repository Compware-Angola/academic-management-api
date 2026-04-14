// src/horarios/dto/listar-horarios.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateStudentEnrollmentUC {
  @ApiProperty({
    description: 'Ano letivo obrigatório',
    example: 21,
    minimum: 1,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  codigoAnoLectivo: number;

  @ApiPropertyOptional({
    description: 'Filtrar por Unidade Curricular',
    example: 486,
    required: true,
  })
  @IsInt()
  @Type(() => Number)
  codigoMatricula: number;

  @ApiProperty({
    description: 'Grade Curricular (lista de códigos)',
    example: [21, 22, 23],
    type: [Number],
    required: false,
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsPositive({ each: true })
  @Type(() => Number)
  codigoGrades: number[];

  @ApiProperty({
    description: 'Grade Curricular',
    example: 21,
    minimum: 1,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  epoca: number;
  @ApiProperty({
    description: 'Observação',
    example: 'Falta de Grade Curricular',
    minimum: 1,
    required: false,
  })
  @IsString()
  @Type(() => String)
  observacao;
}
