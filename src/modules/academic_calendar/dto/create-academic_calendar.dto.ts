import { Type } from 'class-transformer'
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateAcademicCalendarDto {

  @ApiProperty({
    example: 2433,
    description: 'Código do utilizador',
  })
  @Type(() => Number)
  @IsInt()
  codigo_utilizador: number

  @ApiProperty({
    example: '2026-2027',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  designacao: string

  @ApiProperty({
    example: '2026-10-30',
  })
  @IsDateString()
  data_inicio_primeiro_semestre: string

  @ApiProperty({
    example: '2027-02-28',
  })
  @IsDateString()
  data_fim_primeiro_semestre: string

  @ApiProperty({
    example: '2027-03-01',
  })
  @IsDateString()
  data_inicio_segundo_semestre: string

  @ApiProperty({
    example: '2027-07-30',
  })
  @IsDateString()
  data_fim_segundo_semestre: string

  @ApiProperty({
    example: 1,
    description: 'Tipo de candidatura',
  })
  @Type(() => Number)
  @IsInt()
  codigo_tipo_candidatura: number
}