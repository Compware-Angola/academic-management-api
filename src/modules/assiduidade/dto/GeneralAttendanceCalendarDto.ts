import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export type CalendarMode = 'MES' | 'SEMANA' | 'DIA';

export class GeneralAttendanceCalendarDto {
  @ApiPropertyOptional({ example: 'MES', enum: ['MES', 'SEMANA', 'DIA'] })
  @IsIn(['MES', 'SEMANA', 'DIA'])
  modo: CalendarMode;

  @ApiPropertyOptional({ example: '2025-04-15', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dataReferencia deve estar no formato YYYY-MM-DD' })
  dataReferencia?: string;

  @ApiPropertyOptional({ example: '1055', description: 'FK_DOCENTE (pode vir como string na query)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'docenteId deve ser numérico' })
  docenteId?: string;

  @ApiPropertyOptional({ example: 'Rafael Amado Jiménez Martínez', description: 'Nome do docente (legado)' })
  @IsOptional()
  @IsString()
  docenteNome?: string;
}