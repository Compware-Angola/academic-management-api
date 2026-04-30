import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVagaDto {
  @ApiPropertyOptional({
    description: 'ID do curso',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cursoId?: number;

  @ApiPropertyOptional({
    description: 'Cursos opcionais (JSON ou string)',
    example: '[]',
  })
  @IsOptional()
  @IsString()
  cursosOpcionais?: string;

  @ApiPropertyOptional({
    description: 'ID do período',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  periodoId?: number;

  @ApiPropertyOptional({
    description: 'ID do ano letivo',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  anoLetivoId?: number;

  @ApiPropertyOptional({
    description: 'Número de vagas',
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numVagas?: number;
}

