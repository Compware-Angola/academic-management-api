import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  Matches,
  Min,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { PerguntaProvaDto } from './pergunta-prova.dto';
import { CursoProvaDto } from './curso-prova.dto';
import { DisciplinaProvaDto } from './disciplina-prova.dto';

export class CreateProvaDto {
  @ApiProperty({
    description: 'Descrição da prova',
    example: 'Prova de Teologia - 1º Semestre',
  })
  @IsNotEmpty()
  @IsString()
  descricao: string;

  @ApiProperty({
    description: 'Senha da prova',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  senhaProva: string;

  @ApiProperty({
    description: 'Senha da prova',
    example: 123456,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  local: number;

  @ApiProperty({
    description: 'ID do ano letivo',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  anoLetivoId: number;

  @ApiProperty({
    description: 'ID do usuário',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({
    description: 'Duração da prova em minutos',
    example: 120,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  duracao: number;

  @ApiPropertyOptional({
    description: 'Texto da prova',
    example: 'Instruções gerais da prova...',
  })
  @IsOptional()
  @IsString()
  texto?: string;

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
    type: [CursoProvaDto],
    description: 'Lista de cursos da prova',
    example: [{ id: 1 }, { id: 2 }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CursoProvaDto)
  cursos?: CursoProvaDto[];

  @ApiProperty({
    description: 'Data de realização da prova',
    example: '2025-06-15',
  })
  @IsNotEmpty()
  @IsDateString()
  data: string;

  @ApiProperty({
    description: 'Hora de início da prova (formato HH:mm)',
    example: '08:00',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'inicio deve estar no formato HH:mm',
  })
  inicio: string;

  @ApiPropertyOptional({
    description:
      'Hora de fim da prova — calculada automaticamente (inicio + duracao). Não enviar no payload.',
    example: '10:00',
  })
  @IsOptional()
  @IsString()
  @Transform(({ obj }) => {
    if (!obj.inicio || !obj.duracao) return obj.fim;

    const [h, m] = String(obj.inicio).split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return obj.fim;

    const base = new Date(1970, 0, 1, h, m);
    base.setMinutes(base.getMinutes() + Number(obj.duracao));

    const hh = String(base.getHours()).padStart(2, '0');
    const mm = String(base.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  })
  fim?: string;
}
