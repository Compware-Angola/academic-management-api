import { Type } from 'class-transformer'
import {
    IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { VagasItemDto } from './vagas.dto'
 
 export class AcademicCalendarDto {
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
 export class MesItemDTO {
  @ApiProperty({ example: 'SET-2025' })
  @IsString()
  @IsNotEmpty()
  designacao: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  isencao: number;

  @ApiProperty({ example: 9 })
  @IsInt()
  ordem_mes: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  prestacao: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  activo: number;

  @ApiProperty({ example: 0 })
  @IsInt()
  activo_posgraduacao: number;

  @ApiProperty({ example: '2025-09-15' })
  @IsDateString()
  data_limite: string;

  @ApiProperty({ example: '2025-09-01' })
  @IsDateString()
  data_inicial: string;

  @ApiProperty({ example: '2025-09-30' })
  @IsDateString()
  data_final: string;

  @ApiProperty({ example: null, required: false })
  @IsOptional()
  @IsDateString()
  data_final_desconto?: string | null;

  @ApiProperty({ example: 2 })
  @IsInt()
  semestre: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  semestre_posgraduacao: number;
}

export class ConfigureAcademicCalendarDto {
  @ApiProperty({
    description: 'Dados do período',
    type: AcademicCalendarDto,
  })
  @ValidateNested()
  @Type(() => AcademicCalendarDto)
  periodo: AcademicCalendarDto;
  @ApiProperty({
    description: 'Lista de vagas',
    type: [VagasItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VagasItemDto)
  vagas: VagasItemDto[];
@ApiProperty({
    description: 'Lista de meses',
    type: [MesItemDTO],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MesItemDTO)
  meses: MesItemDTO[];
}






