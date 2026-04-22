import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTopicoDto {
  @ApiPropertyOptional({
    description: 'Designação/nome do tópico',
    example: 'Introdução à Álgebra Linear - Atualizado',
  })
  @IsOptional()
  @IsString()
  designacao?: string;

  @ApiPropertyOptional({
    description: 'Nome do arquivo anexado',
    example: 'documento_atualizado.pdf',
  })
  @IsOptional()
  @IsString()
  arquivo?: string;
}
