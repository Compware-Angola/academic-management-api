import {
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  Matches,
  Min,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PerguntaProvaDto } from './pergunta-prova.dto';
import { CursoProvaDto } from './curso-prova.dto';
import { DisciplinaProvaDto } from './disciplina-prova.dto';

export class UpdateProvaDto {
  @ApiPropertyOptional({
    description: 'Senha da prova',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  senhaProva?: string;

  @ApiPropertyOptional({
    description: 'ID do ano letivo',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  anoLetivoId?: number;

  @ApiProperty({
    description: 'Senha da prova',
    example: 123456,
  })
  @IsOptional()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  local: number;

  @ApiPropertyOptional({
    description: 'Duração da prova em minutos',
    example: 120,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  duracao?: number;

  @ApiProperty({
    description: 'Perido de realização',
    example: 'diuro/pos laboral',
  })
  @IsNotEmpty()
  @IsNumber()
  @IsOptional()
  periodo_id: number;

  @ApiPropertyOptional({
    description: 'Descrição da prova',
    example: 'Prova de Teologia - 1º Semestre',
  })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({
    type: [PerguntaProvaDto],
    description: 'Lista de perguntas da prova',
    example: [{ id: 1 }, { id: 2 }, { id: 3 }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PerguntaProvaDto)
  perguntas?: PerguntaProvaDto[];

  @ApiPropertyOptional({
    type: [CursoProvaDto],
    description: 'Lista de cursos da prova',
    example: [{ id: 1 }, { id: 2 }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CursoProvaDto)
  cursos?: CursoProvaDto[];

  @ApiPropertyOptional({
    type: [DisciplinaProvaDto],
    description: 'Lista de disciplinas da prova',
    example: [{ id: 1 }, { id: 2 }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DisciplinaProvaDto)
  disciplinas?: DisciplinaProvaDto[];

  @ApiPropertyOptional({
    description: 'Data de realização da prova',
    example: '2025-06-15',
  })
  @IsOptional()
  @IsDateString()
  data?: string;

  @ApiPropertyOptional({
    description: 'Hora de início da prova (formato HH:mm)',
    example: '08:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'inicio deve estar no formato HH:mm',
  })
  inicio?: string;
}
