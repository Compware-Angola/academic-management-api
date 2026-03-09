import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';

export class FindTeacherClassCalendarDto {
  @ApiPropertyOptional({ example: '1055', description: 'Código do docente' })
  @IsNumberString()
  docente: string;

  @ApiPropertyOptional({ example: '2025-01-01', description: 'Data inicial no formato YYYY-MM-DD' })
  @IsOptional()
  dataInicial?: string;

  @ApiPropertyOptional({ example: '2025-12-31', description: 'Data final no formato YYYY-MM-DD' })
  @IsOptional()
  dataFinal?: string;
}