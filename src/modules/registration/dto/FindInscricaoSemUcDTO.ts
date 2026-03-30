import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class FindInscricaoSemUCDTO {
  @ApiProperty({
    description: 'Ano Lectivo',
    example: 22,
    required: true,
  })
  @IsInt()
  @Type(() => Number)
  codigoAnoLectivo: number;

  @ApiProperty({
    description: 'Código de Curso',
    example: 6,
  })
  @IsInt()
  @Type(() => Number)
  codigoCurso: number;

  @ApiProperty({
    description: 'Grade Curricular',
    example: 170,
  })
  @IsInt()
  @Type(() => Number)
  grade: number;

  @ApiPropertyOptional({ example: 1, description: 'Página atual' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Limite de registros por página',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
