import { IsInt, Min, IsOptional, Max, IsIn, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class getAttendanceListDto {
  @ApiProperty({
    description:
      'Ano letivo no formato de dois dígitos (ex: 25 para 2025/2026)',
    example: 22,
    minimum: 0,
    type: Number,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  anoLectivo: number;

  @ApiProperty({
    description: 'Código do horário associado à turma/disciplina',
    example: 25903,
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  horarioPk?: number;

  @ApiPropertyOptional({
    description: 'Número da página',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: 'Situação Financeira',
    example: 2,
    type: Number,
  })
  @IsInt()
  @IsIn([1, 2])
  @Type(() => Number)
  situacao_financeira: number;

  @ApiProperty({
    description: 'Semestre',
    example: 1,
    type: Number,
  })
  @IsInt()
  @IsIn([1, 2])
  @Type(() => Number)
  semestre: number;

  @ApiProperty({
    description: 'Código do Matricula associado ao aluno',
    example: 25903,
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoMatricula?: number;

  @ApiProperty({
    description: 'Nome do Aluno',
    example: 'Abigail',
    required: false,
    type: String,
  })
  @IsOptional()
  nome?: string;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página (máximo 100)',
    example: 25,
    minimum: 1,
    maximum: 100,
    default: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 25;
}
