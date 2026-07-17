import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumberString, IsOptional } from 'class-validator';

export class FindPostGraduationTeacherClassCalendarDto {
  @ApiPropertyOptional({
    description: 'Grau: 2 = Mestrado, 3 = Doutoramento',
    enum: [2, 3],
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([2, 3])
  degreeId?: number;

  @ApiPropertyOptional({ example: '1055', description: 'Codigo do docente' })
  @IsNumberString()
  docente: string;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Data inicial no formato YYYY-MM-DD',
  })
  @IsOptional()
  dataInicial?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Data final no formato YYYY-MM-DD',
  })
  @IsOptional()
  dataFinal?: string;
}
