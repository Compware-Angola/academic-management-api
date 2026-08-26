import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePreInscritoDto {
  @ApiProperty({ example: 'João Silva', description: 'Nome completo' })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'joao.silva@email.com', description: 'E-mail' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ example: '+244923456789', description: 'Telefone' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  telefone?: string;

  @ApiPropertyOptional({
    example: 'Licenciatura',
    description: 'Tipo de candidatura (grau académico)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(45)
  grauacademico?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Código do tipo de documento',
  })
  @IsOptional()
  @IsNumber()
  tipo_de_documento?: number;

  @ApiPropertyOptional({
    example: '004567890LA042',
    description: 'Número do documento',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  numero_documento?: string;

  @ApiProperty({ example: 'Senha@123', description: 'Senha (mín. 8 caracteres)' })
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @MaxLength(255)
  password: string;

  @ApiPropertyOptional({
    example: 'https://cdn.exemplo.com/foto.jpg',
    description: 'URL da foto',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  foto?: string;
}
