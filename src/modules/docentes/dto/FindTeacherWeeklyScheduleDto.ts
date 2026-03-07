import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';

export class FindTeacherWeeklyScheduleDto {
  @ApiPropertyOptional({ example: '1055', description: 'Código do docente' })
  @IsNumberString()
  docente: string;

  @ApiPropertyOptional({ example: '22', description: 'Código do ano lectivo' })
  @IsNumberString()
  anoLectivo: string;

  @ApiPropertyOptional({ example: '1', description: 'Semestre' })
  @IsNumberString()
  semestre: string;

  @ApiPropertyOptional({ example: '0', description: 'Período. Use 0 para todos' })
  @IsOptional()
  @IsNumberString()
  periodo?: string;
}