import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsNumber,
  IsString,
  ValidateNested,
  IsArray,
  IsNotEmpty,
} from 'class-validator';

export class StudentEvaluationDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  gradeCurricularAluno: number;

  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  utilizador: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  nota: number;                    // ← obrigatório (remove o ?)

  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  tipoDeProva: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  epoca: number;

  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  tipoAvaliacao: number;           // ← obrigatório

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observacao?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  status?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  notaAnterior?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigo_grade_avaliacao_aluno?: number | null;
}

export class StudentEvaluationArrayDto {
  @ApiProperty({ type: [StudentEvaluationDto] })
  @IsArray()
  @IsNotEmpty({ message: 'O array items não pode estar vazio' })
  @ValidateNested({ each: true })
  @Type(() => StudentEvaluationDto)
  items: StudentEvaluationDto[];
}