import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    description: 'IDs das perguntas (separados por vírgula)',
    example: '1,2,3,4,5',
  })
  @IsOptional()
  @IsString()
  perguntas?: string;

  @ApiPropertyOptional({
    description: 'IDs das disciplinas (separados por vírgula)',
    example: '1,2',
  })
  @IsOptional()
  @IsString()
  disciplinas?: string;

  @ApiPropertyOptional({
    description: 'IDs dos cursos (separados por vírgula)',
    example: '1,2,3',
  })
  @IsOptional()
  @IsString()
  cursos?: string;
}
