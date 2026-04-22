import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTopicoDto {
  @ApiProperty({
    description: 'Designação/nome do tópico',
    example: 'Introdução à Álgebra Linear',
  })
  @IsNotEmpty({ message: 'A designação é obrigatória' })
  @IsString()
  designacao: string;

  @ApiProperty({
    description: 'ID do ano letivo',
    example: 23,
  })
  @IsNotEmpty({ message: 'O ano letivo é obrigatório' })
  @IsInt()
  @Min(1)
  anoLetivoId: number;

  @ApiPropertyOptional({
    description: 'Nome do arquivo anexado',
    example: 'documento.pdf',
  })
  @IsOptional()
  @IsString()
  arquivo?: string;
}
