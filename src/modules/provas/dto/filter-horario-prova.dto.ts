import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterHorarioProvaDto {
  @ApiPropertyOptional({
    description: 'ID da prova',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return parseInt(value, 10);
  })
  @IsInt()
  @Min(1)
  provaId?: number;

  @ApiPropertyOptional({
    description: 'ID da sala',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return parseInt(value, 10);
  })
  @IsInt()
  @Min(1)
  salaId?: number;

  @ApiPropertyOptional({
    description: 'ID do polo',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return parseInt(value, 10);
  })
  @IsInt()
  @Min(1)
  poloId?: number;

  @ApiPropertyOptional({
    description: 'ID do usuário',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return parseInt(value, 10);
  })
  @IsInt()
  @Min(1)
  userId?: number;

  @ApiPropertyOptional({
    description: 'ID do curso',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return parseInt(value, 10);
  })
  @IsInt()
  @Min(1)
  cursoId?: number;

  @ApiPropertyOptional({
    description: 'ID do período',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return parseInt(value, 10);
  })
  @IsInt()
  @Min(1)
  periodoId?: number;

  @ApiPropertyOptional({
    description: 'ID do ano letivo',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return parseInt(value, 10);
  })
  @IsInt()
  @Min(1)
  anoLetivoId?: number;

  @ApiPropertyOptional({
    description: 'Data de realização (formato: YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  dataRealizacao?: string;

  @ApiPropertyOptional({
    description: 'Hora de início (formato: HH:MM ou HH:MM:SS)',
  })
  @IsOptional()
  @IsString()
  horaInicio?: string;

  @ApiPropertyOptional({
    description: 'Hora de fim (formato: HH:MM ou HH:MM:SS)',
  })
  @IsOptional()
  @IsString()
  horaFim?: string;

  @ApiPropertyOptional({
    description: 'Número da página',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

