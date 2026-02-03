import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GradeItemDto {
  @ApiProperty({
    description: 'Código da grade/disciplina',
    example: 44,
  })
  @IsInt()
  @Type(() => Number)
  codigo: number;

  @ApiProperty({
    description: 'Duração da disciplina (Semestral ou Anual)',
    example: 'Semestral',
  })
  @IsString()
  duracaoDisciplina: string;

  @ApiProperty({
    example: 1,
    description: 'Semestre da disciplina (1 = Primeiro, 2 = Segundo)',
  })
  @IsInt()
  @Min(1)
  @Max(2)
  @Type(() => Number)
  semestre: number;
}

export class EnrollmentDto {
  @ApiProperty({
    description: 'Código único da pré-inscrição do aluno',
    example: '97283',
  })
  @IsString()
  codPreInscricao: string;

  @ApiProperty({
    description: 'Lista de grades/disciplina com semestre e duração',
    type: [GradeItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GradeItemDto)
  grades: GradeItemDto[];
}
