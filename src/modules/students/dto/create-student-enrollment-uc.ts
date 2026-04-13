// src/horarios/dto/listar-horarios.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsPositive } from 'class-validator';

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
    description: 'Grade Curricular',
    example: 21,
    minimum: 1,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  codigoGrade: number;

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
}
