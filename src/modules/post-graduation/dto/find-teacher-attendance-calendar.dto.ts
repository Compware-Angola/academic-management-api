import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches } from 'class-validator';

export type PostGraduationCalendarMode = 'MES' | 'SEMANA' | 'DIA';

export class FindPostGraduationTeacherAttendanceCalendarDto {
  @ApiPropertyOptional({
    description: 'Grau: 2 = Mestrado, 3 = Doutoramento',
    enum: [2, 3],
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([2, 3])
  degreeId?: number;

  @ApiPropertyOptional({ example: 'MES', enum: ['MES', 'SEMANA', 'DIA'] })
  @IsIn(['MES', 'SEMANA', 'DIA'])
  modo: PostGraduationCalendarMode;

  @ApiPropertyOptional({ example: '2026-04-15', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dataReferencia deve estar no formato YYYY-MM-DD',
  })
  dataReferencia?: string;

  @ApiPropertyOptional({ example: '1055', description: 'Codigo do docente' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'docenteId deve ser numerico' })
  docenteId?: string;

  @ApiPropertyOptional({
    example: 'Rafael Amado Jiménez Martínez',
    description: 'Nome do docente mantido para compatibilidade com o legado',
  })
  @IsOptional()
  @IsString()
  docenteNome?: string;
}
