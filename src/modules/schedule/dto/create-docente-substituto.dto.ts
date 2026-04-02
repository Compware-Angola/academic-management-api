import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDocenteSubstitutoDto {
  @ApiProperty({
    example: 1,
    description: 'ID do docente original (que está sendo substituído)',
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  fkDocenteOriginal: number;

  @ApiProperty({
    example: 2,
    description: 'ID do docente substituto (que vai assumir)',
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  fkDocenteSubstituto: number;

  @ApiProperty({
    example: 10,
    description: 'ID do horário que está sendo substituído',
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  fkHorario: number;

  @ApiProperty({
    example: '2025-01-01',
    description: 'Data de início da substituição (formato YYYY-MM-DD)',
  })
  @IsNotEmpty()
  @IsString()
  dataInicio: string;

  @ApiPropertyOptional({
    example: '2025-06-30',
    description: 'Data de término da substituição (formato YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  dataTermino?: string;

  @ApiPropertyOptional({
    example: 'Substituição por motivo de doença',
    description: 'Observações sobre a substituição',
  })
  @IsOptional()
  @IsString()
  obs?: string;
}