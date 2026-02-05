// src/horarios/dto/listar-horarios.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsPositive } from 'class-validator';

export class FindPrazosMatricula {
  @ApiProperty({
    description: 'Ano letivo obrigatório',
    example: 22,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  anoLectivo: number;
}
