import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateHorarioProvaDto {
  @ApiPropertyOptional({
    description: 'ID da prova',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  provaId?: number;

  @ApiPropertyOptional({
    description: 'Data de realização (formato: YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  dataRealizacao?: string;

  @ApiPropertyOptional({
    description: 'Hora de início (formato: HH:MM)',
  })
  @IsOptional()
  @IsString()
  horaInicio?: string;

  @ApiPropertyOptional({
    description: 'Hora de fim (formato: HH:MM)',
  })
  @IsOptional()
  @IsString()
  horaFim?: string;

  @ApiPropertyOptional({
    description: 'ID da sala',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  salaId?: number;

  @ApiPropertyOptional({
    description: 'ID do polo',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  poloId?: number;

  @ApiPropertyOptional({
    description: 'ID do usuário',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;

  @ApiPropertyOptional({
    description: 'ID do curso',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  cursoId?: number;

  @ApiPropertyOptional({
    description: 'ID do período',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  periodoId?: number;

  @ApiPropertyOptional({
    description: 'ID do ano letivo',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  anoLetivoId?: number;
}


