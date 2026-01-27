// src/users/dto/create-person-user.dto.ts
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePersonUserDto {
  @ApiProperty({ example: 'João António da Silva' })
  @IsNotEmpty()
  @IsString()
  nomeCompleto: string;

  @ApiProperty({ example: '001234567LA047' })
  @IsNotEmpty()
  @IsString()
  numDocIdentificacao: string;

  @ApiProperty({ example: 'joao.silva@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '1990-05-15', required: false })
  @IsOptional()
  @IsString()
  dataDeNascimento?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  tipoDocumentoId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  sexoId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  estadoCivilId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  nacionalidadeId: number;

  @ApiProperty({ example: '912345678', required: false })
  @IsOptional()
  @IsString()
  telefone1?: string;

  @ApiProperty({ example: '987654321', required: false })
  @IsOptional()
  @IsString()
  telefone2?: string;

  @ApiProperty({ 
    example: 'SenhaForte@2025', 
    minLength: 8, 
    required: false, 
    description: 'Senha (mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 símbolo)' 
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;:',.<>/?~])[A-Za-z\d!@#$%^&*()_+\-=[\]{}|;:',.<>/?~]+$/, {
    message: 'A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um símbolo',
  })
  senha?: string;
}