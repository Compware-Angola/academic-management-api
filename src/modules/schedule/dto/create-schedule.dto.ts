// create-schedule.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsEnum,
  Min,
  Max,
  IsString,
  IsEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum DiaSemana {
  SEGUNDA = 1,
  TERCA = 2,
  QUARTA = 3,
  QUINTA = 4,
  SEXTA = 5,
  SABADO = 6,
  DOMINGO = 7,
}

export class AulaDto {
  @ApiProperty({
    description: 'ID do docente',
    example: 1263,
  })
  @IsInt()
  @Min(1)
  docente: number;

  @ApiProperty({
    description: 'Dia da semana (1=Segunda ... 7=Domingo)',
    enum: DiaSemana,
    example: 3,
  })
  @IsEnum(DiaSemana)
  diaSemana: DiaSemana;
@ApiProperty({
    description: 'Observação',
    example: 'Observação',
  })
  @IsString()
@IsOptional()
  obs?:string
  @ApiProperty({
    description: 'Ordem do tempo/horário no dia (ex: 1 = 8h–9h30, 5 = tarde)',
    example: 1,
    minimum: 1,
    maximum: 10,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  ordemTempo: number;

  @ApiProperty({
    description: 'ID da sala',
    example: 93,
  })
  @IsInt()
  @Min(1)
  sala: number;



  @ApiProperty({
    description: 'Tipo de aula (1 = Teórica, 2 = Prática, etc.)',
    example: 1,
  })
  @IsInt()
  @Min(1)
  tipoAula: number;

  // No teu exemplo estes campos vêm vazios, por isso são opcionais/empty
  @ApiPropertyOptional({
    description: 'Hora de início no formato HH:mm (pode vir vazio)',
    example: '',
  })
  @IsOptional()
  @IsString()
  hora_inicio?: string = '09:30';

  @ApiPropertyOptional({
    description: 'Hora de fim no formato HH:mm (pode vir vazio)',
    example: '',
  })
  @IsOptional()
  @IsString()
  hora_fim?: string = '10:45';
}

export class CreateScheduleDto {
  @ApiProperty({
    description: 'Ano letivo (últimos 2 dígitos, ex: 23 = 2023/2024)',
    example: 23,
  })
  @IsInt()
  @Min(0)
  anoLectivo: number;

  @ApiProperty({
    description: 'Semestre (1 ou 2)',
    example: 1,
    enum: [1, 2],
  })
  @IsInt()
  @Min(1)
  @Max(2)
  semestre: number;

  @ApiProperty({
    description: 'Período (normalmente 1–5 ou 1–6 dependendo do calendário)',
    example: 5,
  })
  @IsInt()
  @Min(1)
  periodo: number;

  @ApiProperty({
    description: 'ID do curso',
    example: 6,
  })
  @IsInt()
  @Min(1)
  curso: number;

  @ApiProperty({
    description: 'ID da unidade curricular',
    example: 198,
  })
  @IsInt()
  @Min(1)
  unidadeCurricular: number;

  @ApiProperty({
    description: 'Modalidade da turma (1 = Diurno, 2 = Pós-laboral, etc.)',
    example: 1,
  })
  @IsInt()
  @Min(1)
  modalidade: number;
@ApiPropertyOptional({ description: 'Se é apenas 1º ano (capacidade = 100)', example: 0, default: 0 })
@IsOptional()
@IsInt()
@Min(0)
@Max(1)
@ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  estadoHorario?: number = 1;
@ApiProperty({
    description: 'Descrição/nome do horário (ex: "Horário LEI 1º ano - 2024/25")',
    example: 'Horário LEI 1º ano - Programação Web',
  })
  @IsString()
  @IsNotEmpty()
  designacao: string;

  @ApiProperty({
    description: 'Capacidade máxima da turma/sala',
    example: 35,
    default: 30,
  })
  @IsInt()
  @IsOptional()
  capacidade?: number = 30;

  @ApiPropertyOptional({
    description: 'Código da turma (ex: LEI-A, LEI-B)',
    example: 12,
  })
  @IsOptional()
  @IsInt()
  turma?: number;
    @ApiPropertyOptional({
    description: 'Primeiro ano',
    example: 0,
  })
  @IsOptional()
  @IsInt()
apenasPrimeiroAno?: number = 0;
  @ApiProperty({
    description: 'Tipo de aula geral da UC (normalmente 1 = Teórica)',
    example: 1,
  })
  @IsInt()
  @Min(1)
  tipoAula: number;

  @ApiProperty({
    type: [AulaDto],
    description: 'Lista de aulas/semana',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AulaDto)
  @IsNotEmpty()
  aulas: AulaDto[];

@ApiProperty({
    description: 'Observação',
    example: 'Observação',
  })
  @IsString()
@IsOptional()
  obs?:string
}