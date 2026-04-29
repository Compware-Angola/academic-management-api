import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
}
