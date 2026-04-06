import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class FindEstudantesSemInscricaoCursoDTO {
  @ApiProperty({
    description: 'Ano Lectivo',
    example: 22,
    required: true,
  })
  @IsInt()
  @Type(() => Number)
  codigoAnoLectivo: number;

  @ApiProperty({
    description: 'Código de Curso',
    example: 6,
  })
  @IsInt()
  @Type(() => Number)
  codigoCurso: number;

  @ApiPropertyOptional({
    description: 'Código de Matricula',
    example: 5,
  })
  @IsInt()
  @Type(() => Number)
  @IsOptional()
  codigoMatricula?: number;

  @ApiPropertyOptional({
    description: 'Nome do Estudante',
    example: 'Laurinda Milena da Silva Domingos Talo',
  })
  @IsOptional()
  @IsString()
  @Type(() => String)
  nome?: string;

  @ApiPropertyOptional({ example: 1, description: 'Página atual' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Limite de registros por página',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
