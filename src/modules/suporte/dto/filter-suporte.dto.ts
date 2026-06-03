import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, Min, Max, IsNumberString } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterSuporteDto {
  @ApiPropertyOptional({
    description: 'Número da página (começa em 1)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de registos por página (máx. 100)',
    example: 25,
    minimum: 1,
    maximum: 100,
    default: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 25;

  @ApiPropertyOptional({
    description: 'Pesquisa livre (nome do estudante, assunto, mensagem, utilizador, tipo de suporte, etc.)',
    example: 'joão matemática',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'ID do tipo de suporte (fk2_tipo_suporte.ID)',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tipo_suporte?: number;

  @ApiPropertyOptional({
    description: 'Estado da solicitação',
    enum: ['a responder', 'aguarda resposta', 'respondido'],
    example: 'pendente',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Código da matrícula do estudante',
    example: '62800',
  })
  @IsOptional()
 @IsInt()
@Type(() => Number)
  codigo_matricula?: number;



}