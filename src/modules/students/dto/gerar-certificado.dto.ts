import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class GerarCertificadoDto {
  @ApiProperty({ example: 42093, description: 'ID da matrícula do aluno' })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  matriculaId: number;

  @ApiProperty({ example: 1, description: 'Ano curricular inicial (mínimo)' })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  anoMin: number;

  @ApiProperty({ example: 2, description: 'Ano curricular final (máximo)' })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  anoMax: number;
}   