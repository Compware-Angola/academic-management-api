import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';

export class FindRelatorioAssiduidadeDto {
  @ApiPropertyOptional({ example: 2025, description: 'Ano lectivo' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  anoLectivo?: number = 0;

  @ApiPropertyOptional({ example: 1, description: 'Semestre (1 ou 2)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  semestre?: number = 0;

  @ApiPropertyOptional({ example: 10, description: 'Código do curso' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  curso?: number = 0;

  @ApiPropertyOptional({ example: 45, description: 'Código do docente' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  docente?: number = 0;

  @ApiPropertyOptional({
    example: '2025-01-01',
    description: 'Data inicial do relatório',
  })
  @IsOptional()
  @IsString()
  dataInicial?: string;

  @ApiPropertyOptional({
    example: '2025-01-31',
    description: 'Data final do relatório',
  })
  @IsOptional()
  @IsString()
  dataFinal?: string;

  // Flags booleanas
  @ApiPropertyOptional({
    example: false,
    description: 'Se verdadeiro não cobra faltas',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  naoCobrarFaltas?: boolean = false;

  @ApiPropertyOptional({
    example: true,
    description: 'Exigir presenças confirmadas',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  exigirPresencasConfirmadas?: boolean = false;

  @ApiPropertyOptional({
    example: true,
    description: 'Exigir sumários inseridos',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  exigirSumariosInseridos?: boolean = false;

  @ApiPropertyOptional({
    example: true,
    description: 'Exigir sumários válidos',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  exigirSumariosValidos?: boolean = false;

  @ApiPropertyOptional({ example: 1, description: 'Página atual' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Quantidade por página' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}