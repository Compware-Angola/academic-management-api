import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class GetStudentSummaryDto {
  @ApiProperty({ description: 'Código do ano letivo', example: 18 })
  @IsNumber()
  @Type(() => Number)
  anoLectivoId: number;

  @ApiProperty({ description: 'Nome do aluno', example: "", required: false })
  @IsOptional()
  @IsString()
  @Type(() => String)
  search?: string;

  @ApiProperty({ description: 'Código do Horario', example: 346 })
  @IsNumber()
  @Type(() => Number)
  horarioId: number;

  @ApiProperty({ description: 'Tipo de prova', example: 1 })
  @IsNumber()
  @Type(() => Number)
  tipoProvaId: number;

  @ApiProperty({ description: 'Tipo de Avaliação', example: 2 })
  @IsNumber()
  @Type(() => Number)
  tipoAvaliacao: number;

  @ApiProperty({ description: 'Classe do aluno', example: 2 })
  @IsNumber()
  @Type(() => Number)
  classe: number;

  @ApiProperty({ description: 'Turno do aluno', example: 5 })
  @IsNumber()
  @Type(() => Number)
  turno: number;


}