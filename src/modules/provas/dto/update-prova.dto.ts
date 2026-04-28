import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
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

  @ApiPropertyOptional({
    description: 'Duração da prova em minutos',
    example: 120,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  duracao?: number;

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
}
