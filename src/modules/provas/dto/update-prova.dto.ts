import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
    description: 'IDs das perguntas (separados por vírgula)',
    example: '1,2,3,4,5',
  })
  @IsOptional()
  @IsString()
  perguntas?: string;

  @ApiPropertyOptional({
    description: 'IDs dos cursos (separados por vírgula)',
    example: '1,2,3',
  })
  @IsOptional()
  @IsString()
  cursos?: string;
}
