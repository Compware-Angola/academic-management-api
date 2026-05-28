import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateAcademicActivityTermDto {
  @ApiPropertyOptional({
    description: 'Observação do prazo',
    example: 'Prazo atualizado',
  })
  @IsString()
  @IsOptional()
  observacao?: string | null;

  @ApiProperty({
    description: 'Código do semestre',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  fk_semestre: number;

  @ApiProperty({
    description: 'Data de início',
    example: '2026-05-01',
  })
  @IsDateString()
  @IsNotEmpty()
  data_inicio: string;

  @ApiProperty({
    description: 'Data de fim',
    example: '2026-05-30',
  })
  @IsDateString()
  @IsNotEmpty()
  data_fim: string;

  @ApiPropertyOptional({
    description: 'Código do tipo de avaliação',
    example: 2,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  fk_tipo_avaliacao?: number;

  @ApiProperty({
    description: 'Código do tipo de prazo',
    example: 4,
  })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  fk_tipo_prazo: number;

  @ApiProperty({
    description: 'Tipo de candidatura',
    example: '1',
  })
  @IsString()
  @IsNotEmpty()
  tipo_candidatura: string;
}
