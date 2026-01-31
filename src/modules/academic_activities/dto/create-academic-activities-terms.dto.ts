import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Validate,
} from 'class-validator';
import { IsNotPastDate } from '../util/validator/is-not-past-date.validator';
import { IsEndDateAfterStartDate } from '../util/validator/is-end-date-after-start-date.validator';

export class CreateAcademicActivitiesTermsDto {
  @ApiProperty({
    description: 'Tipo de avaliação',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  fk_tipo_avaliacao: number;

  @ApiProperty({
    description: 'Semestre',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  fk_semestre: number;

  @ApiProperty({
    description: 'Tipo de prazo',
    example: 4,
  })
  @IsNumber()
  @IsNotEmpty()
  fk_tipo_prazo: number;

  @ApiProperty({
    description: 'Ano lectivo',
    example: 2024,
  })
  @IsNumber()
  @IsNotEmpty()
  fk_ano_lectivo: number;

  @ApiProperty({
    description: 'Data de início (ISO 8601)',
    example: '2025-02-01T08:00:00',
  })
  @IsDateString()
  @IsNotEmpty()
  @IsNotPastDate({
    message: 'A data início não pode ser uma data passada',
  })
  data_inicio: string;

  @ApiProperty({
    description: 'Data de fim (ISO 8601)',
    example: '2025-02-15T23:59:59',
  })
  @IsDateString()
  @IsNotEmpty()
  @IsNotPastDate({
    message: 'A data fim não pode ser uma data passada',
  })
  @Validate(IsEndDateAfterStartDate)
  data_fim: string;

  @ApiPropertyOptional({
    description: 'Observação',
    example: 'Prazo para marcação de provas do 1º semestre',
  })
  @IsString()
  @IsOptional()
  observacao?: string;

  @ApiProperty({
    description: 'ID do utilizador que criou o registo',
    example: 10,
  })
  @IsNumber()
  @IsNotEmpty()
  fk_created_by: number;

  @ApiProperty({
    description: 'Tipo de candidatura',
    example: 'N',
  })
  @IsString()
  @IsNotEmpty()
  tipo_candidatura: string;
}
