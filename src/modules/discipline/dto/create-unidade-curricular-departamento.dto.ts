// dto/create-unidade-curricular-departamento.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsPositive, ArrayMinSize } from 'class-validator';

export class CreateUnidadeCurricularDepartamentoDto {
  @ApiProperty({ example: 1, description: 'Código da disciplina' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  codigoDisciplina: number;

  @ApiProperty({ example: 1, description: 'Código do departamento' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  codigoDepartamento: number;

  @ApiProperty({ example: 23, description: 'Código do ano lectivo' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  codigoAnoLectivo: number;

  @ApiProperty({ example: 1, description: 'Código do semestre' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  codigoSemestre: number;

  @ApiProperty({ example: 1, description: 'Código da classe' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  codigoClasse: number;

  @ApiProperty({ example: 1074, description: 'Código do utilizador' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  codigoUtilizador: number;

  @ApiProperty({
    example: [{ codigoCurso: 1 }, { codigoCurso: 2 }],
    description: 'Lista de cursos',
    type: () => [CursoItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  cursos: CursoItemDto[];
}

export class CursoItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  codigoCurso: number;
}