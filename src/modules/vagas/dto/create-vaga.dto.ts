import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVagaDto {
  @ApiProperty({
    description: 'ID do curso',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cursoId: number;

  @ApiPropertyOptional({
    description: 'Cursos opcionais (JSON ou string)',
    example: '[]',
  })
  @IsOptional()
  @IsString()
  cursosOpcionais?: string;

  @ApiProperty({
    description: 'ID do período',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  periodoId: number;

  @ApiProperty({
    description: 'ID do ano letivo',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  anoLetivoId: number;

  @ApiProperty({
    description: 'Número de vagas',
    example: 50,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numVagas: number;

  @ApiProperty({
    description: 'ID do tipo de candidatura',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tipoCandidaturaId: number;
}

