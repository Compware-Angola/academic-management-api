import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class FindPostGraduationSummaryScheduledClassesDto {
  @ApiProperty({
    description: 'Data inicial do intervalo',
    example: '2026-01-02',
    type: String,
    format: 'date',
  })
  @IsDateString()
  dataInicial: string;

  @ApiProperty({
    description: 'Data final do intervalo',
    example: '2026-05-02',
    type: String,
    format: 'date',
  })
  @IsDateString()
  dataFinal: string;

  @ApiPropertyOptional({
    description: 'Grau: 2 = Mestrado, 3 = Doutoramento',
    enum: [2, 3],
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([2, 3])
  degreeId?: number;

  @ApiPropertyOptional({ description: 'ID da Unidade Curricular', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unidadeCurricular?: number;

  @ApiPropertyOptional({ description: 'ID do Docente', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  docente?: number;

  @ApiPropertyOptional({ description: 'Estado do agendamento', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  estado?: number;

  @ApiPropertyOptional({ description: 'Ano lectivo', example: 23 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anoLectivo?: number;

  @ApiPropertyOptional({ description: 'Semestre', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semestre?: number;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
