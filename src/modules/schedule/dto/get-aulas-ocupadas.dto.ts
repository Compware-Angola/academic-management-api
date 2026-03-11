import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class GetAulasOcupadasDto {
  @ApiProperty({
    description: 'Ano lectivo',
    example: 23,
  })
  @Type(() => Number)
  @IsInt()
  anoLectivo: number;

  @ApiProperty({
    description: 'Período',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  periodo: number;

  @ApiProperty({
    description: 'Semestre',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  semestre: number;

  @ApiPropertyOptional({
    description: 'ID do horário a ignorar (usado ao editar)',
    example: 10,
    required:false
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  horarioId?: number;
}