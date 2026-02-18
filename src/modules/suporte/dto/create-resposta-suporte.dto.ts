import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateRespostaSuporteDto {
  @ApiProperty({
    example: 'Já resolvemos o problema da nota. Por favor verifique no sistema.',
    description: 'Texto da resposta ao pedido de suporte',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descricao: string;

  @ApiProperty({
    example: 145,
    description: 'ID do contacto/solicitação original (fk2_contactos.ID)',
  })
  @IsInt()
  contactos_id: number;



  @ApiPropertyOptional({
    example: 'comprovativo.pdf',
    description: 'Nome do primeiro ficheiro anexado (opcional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  file_name1?: string;

  @ApiPropertyOptional({
    example: 'print_erro.jpg',
    description: 'Nome do segundo ficheiro anexado (opcional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  file_name2?: string;

  @ApiPropertyOptional({
    example: 'relatorio.docx',
    description: 'Nome do terceiro ficheiro anexado (opcional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  file_name3?: string;


}