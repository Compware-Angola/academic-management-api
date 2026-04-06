import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsNumber,
  IsString,
  IsObject,
  ValidateNested,
  IsArray,
} from 'class-validator';

export class StudentEvaluationDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  gradeCurricularAluno: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  utilizador: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  nota?: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  tipoDeProva: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  epoca: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  tipoAvaliacao: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observacao?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  status?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  notaAnterior?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  codigo_grade_avaliacao_aluno?: number;
}

export class StudentEvaluationArrayDto {
  @ApiProperty({ type: [StudentEvaluationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentEvaluationDto)
  items: StudentEvaluationDto[];
}
