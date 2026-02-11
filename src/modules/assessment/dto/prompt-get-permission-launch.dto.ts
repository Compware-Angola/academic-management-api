import { IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PromptGetPermissionLaunchDTO {
  @ApiProperty({
    description:
      'Ano letivo no formato de dois dígitos (ex: 25 para 2025/2026)',
    example: 23,
    minimum: 0,
    type: Number,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  anoLectivo: number;

  @ApiProperty({
    description: 'Grade Curricular',
    example: 454,
    type: Number,
  })
  @IsInt()
  @Type(() => Number)
  grade: number;

  @ApiProperty({
    description: 'Tipo de Avaliação',
    example: 3,
    type: Number,
  })
  @IsInt()
  @Type(() => Number)
  tipoAvaliacao: number;

  @ApiProperty({
    description: 'utilizadorId',
    example: 163,
    type: Number,
  })
  @IsInt()
  @Type(() => Number)
  utilizadorId: number;
}
