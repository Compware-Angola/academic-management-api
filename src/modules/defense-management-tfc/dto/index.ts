import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ListFinalistStudentsQueryDto {
  @ApiPropertyOptional({ description: 'Ano letivo', example: 21 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  anoLectivo?: number;

  @ApiPropertyOptional({ description: 'Tipo de candidatura', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tipoCandidatura?: number;

  @ApiPropertyOptional({ description: 'Código do curso', example: 10 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  curso?: number;

  @ApiPropertyOptional({ description: 'Número da página', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Número de registros por página', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Type(() => Number)
  limit?: number;
}



export class FinalistStudentDto {
  @ApiProperty({ description: 'Nome completo do estudante', example: 'José Manuel' })
  nome: string;

  @ApiProperty({ description: 'Número do bilhete de identidade', example: '12345678LA' })
  bilhete: string;

  @ApiProperty({ description: 'Gênero do estudante', example: 'M' })
  genero: string;

  @ApiProperty({ description: 'Código da matrícula', example: 12345 })
  matricula: number;

  @ApiProperty({ description: 'Nome do curso', example: 'Engenharia Informática' })
  curso: string;
}


export class ListFinalistStudentsResponseDto {
  @ApiProperty({
    description: 'Lista de estudantes finalistas',
    type: [FinalistStudentDto],
  })
  data: FinalistStudentDto[];

  @ApiProperty({
    description: 'Total de estudantes finalistas',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Número da página atual',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Quantidade de registros por página',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total de páginas',
    example: 10,
  })
  totalPages: number;
}

export class FiltroOrientadorDto {
  @ApiPropertyOptional({ description: 'Ano letivo', example: 21 })
  @IsOptional()
  @IsInt()
    @Type(() => Number)
  anoLectivoId?: number;

  @ApiPropertyOptional({ description: 'Código do curso', example: 10 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  cursoId?: number;

  @ApiPropertyOptional({ description: 'Estado do orientador', example: 'activo' })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({ description: 'Número da página', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Número de registros por página', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Type(() => Number)
  limit?: number;
}

export class CreateOrientadorDto {
  @ApiProperty({ description: 'Código do docente', example: 1 })
  @IsInt()
  @Type(() => Number)
  docenteId: number;

  @ApiProperty({ description: 'Código do curso', example: 10 })
  @IsInt()
  @Type(() => Number)
  cursoId: number;

  @ApiProperty({ description: 'Código do ano letivo', example: 21 })
  @IsInt()
  @Type(() => Number)
  anoLectivoId: number;

  @ApiProperty({ description: 'Estado do orientador', example: 'activo' })
  @IsString()
  estado: string;
}

export class AtribuirOrientadorTemaDto {
  @ApiProperty({ description: 'Código da matrícula do aluno', example: 12345 })
  @IsInt()
  @Type(() => Number)
  codigoMatricula: number;

  @ApiProperty({ description: 'Código do orientador', example: 1 })
  @IsInt()
  @Type(() => Number)
  codigoOrientador: number;

  @ApiProperty({ description: 'Código do tema', example: 'Tema 1' })
  @IsString()
  tema: string;

  @ApiProperty({ description: 'Código do ano letivo', example: 21 })
  @IsInt()
  @Type(() => Number)
  anoLectivoId: number;
}



export class ListarAlunosPorOrientadorDto {
  @ApiProperty({ description: 'Código do orientador', example: 1 })
  @IsInt()
  @Type(() => Number)
  orientadorId: number;

  @ApiProperty({ description: 'Código do ano letivo', example: 21 })
  @IsInt()
  @Type(() => Number)
  anoLectivoId: number;
}




export class FiltroListagemGeralDto {
  @ApiProperty({ description: 'Código do ano letivo', example: 23 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  anoLectivoId: number;

  @ApiPropertyOptional({ description: 'Código do orientador', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  orientadorId?: number;

  @ApiPropertyOptional({ description: 'Código do curso', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cursoId?: number;

  @ApiPropertyOptional({ description: 'Pesquisa', example: 'José' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Número da página', example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Número de registros por página', example: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}
