import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FindStudentsWithoutScheduleDto {
  @ApiProperty({
    description: 'Ano lectivo para filtrar os estudantes',
    example: 23,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  anoLectivo: number;

  @ApiPropertyOptional({
    description: 'Semestre para filtrar os estudantes',
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  semestre?: number;

  @ApiPropertyOptional({
    description: 'Classe para filtrar os estudantes',
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  classe?: number;

  @ApiPropertyOptional({
    description: 'Curso para filtrar os estudantes',
    example: 13,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  curso?: number;

  @ApiPropertyOptional({
    description:
      'Termo de pesquisa (nome do disciplina ou código da matrícula)',
    example: 'Programação',
  })
  @IsOptional()
  @IsString()
  searchTerm?: string;

  @ApiPropertyOptional({
    description: 'Página da listagem',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Quantidade de registos por página',
    example: 25,
    default: 25,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
