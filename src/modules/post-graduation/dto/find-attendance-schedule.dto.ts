import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';

export class FindPostGraduationAttendanceScheduleDto {
  @ApiPropertyOptional({
    description: 'Grau: 2 = Mestrado, 3 = Doutoramento',
    enum: [2, 3],
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([2, 3])
  degreeId?: number;

  @ApiPropertyOptional({ description: 'Codigo da Unidade Curricular' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unidadeCurricular?: number;

  @ApiPropertyOptional({ description: 'Codigo do periodo' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodoId?: number;

  @ApiPropertyOptional({ description: 'Codigo do docente' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  docente?: number;

  @ApiProperty({
    description: 'Data inicial do intervalo',
    example: '2026-01-02',
    type: String,
    format: 'date',
  })
  @IsNotEmpty()
  @Type(() => Date)
  dataInicial: Date;

  @ApiProperty({
    description: 'Data final do intervalo',
    example: '2026-05-02',
    type: String,
    format: 'date',
  })
  @IsNotEmpty()
  @Type(() => Date)
  dataFinal: Date;

  @ApiPropertyOptional({ description: 'Estado do agendamento' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  estado?: number;

  @ApiPropertyOptional({ description: 'Codigo do ano lectivo' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anoLectivo?: number;

  @ApiPropertyOptional({ description: 'Codigo do semestre' })
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

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
