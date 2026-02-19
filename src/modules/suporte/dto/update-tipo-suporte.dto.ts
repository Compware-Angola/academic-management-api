import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateTipoSuporteDto {
  @ApiPropertyOptional({ example: 'Dúvida Pedagógica' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  descricao?: string;
}