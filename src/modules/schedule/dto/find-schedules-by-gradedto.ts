import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FindSchedulesByGradeDto {
  @ApiProperty({
    description: 'Ano lectivo para filtrar os horários',
    example: 23,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  anoLectivo: number;

  @ApiProperty({
    description: 'Período para filtrar os horários',
    example: 5,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  periodo?: number;

  @ApiProperty({
    description: 'Código da grade curricular para filtrar os horários',
    example: 710,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  gradeCurricular: number;
}
