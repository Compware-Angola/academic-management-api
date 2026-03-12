// dto/create-unidade-curricular.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsPositive } from 'class-validator';

export class CreateUnidadeCurricularDto {
  @ApiProperty({ example: 1, description: 'Código da disciplina' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  codigoDisciplina: number;

  @ApiProperty({ example: 23, description: 'Código do ano lectivo' })
  @IsNumber()
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

  @ApiProperty({ example: 1, description: 'Código do curso' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  codigoCurso: number;

}