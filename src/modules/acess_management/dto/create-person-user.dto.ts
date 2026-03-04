// src/users/dto/create-person-user.dto.ts
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  Validate,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsAtLeastYearsOld } from 'src/modules/common/validators/is-at-least-years-old.validator';

export class CreatePersonUserDto {
  @ApiProperty({ example: 'João António da Silva' })
  @IsNotEmpty()
  @IsString()
  nomeCompleto: string;

  @ApiProperty({ example: '001234567LA047' })
  @IsNotEmpty()
  @IsString()
  @Matches(
    /^\d{9}[A-Z]{2}\d{3}$/,
    {
      message:
        'O número de Bilhete de Identidade (BI) deve seguir o formato angolano: 9 dígitos + 2 letras maiúsculas + 3 dígitos (ex: 001234567LA047)',
    },
  )
  numDocIdentificacao: string;

  @ApiProperty({ example: 'joao.silva@email.com' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ example: '1990-05-15', required: false })
  @IsOptional()
  @IsString()
  @Validate(IsAtLeastYearsOld, [17], {
    message: 'O utilizador deve ter pelo menos 17 anos de idade',
  })
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
  @Matches(
  /^(\+244)?9\d{8}$/,
  {
    message:
      'O telefone deve ter 9 dígitos começando com 9, podendo incluir o prefixo +244 (ex: 912345678 ou +244912345678)',
  },
)
telefone1?: string;

  @ApiProperty({ example: '987654321', required: false })
  @IsOptional()
  @IsString()
  @Matches(
  /^(\+244)?9\d{8}$/,
  {
    message:
      'O telefone deve ter 9 dígitos começando com 9, podendo incluir o prefixo +244 (ex: 912345678 ou +244912345678)',
  },
)
telefone2?: string;
 /*
  @ApiProperty({
    example: 'SenhaForte@2025',
    minLength: 8,
    required: false,
    description:
      'Senha (mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 símbolo)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'A senha não pode estar vazia quando informada' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;:',.<>/?~])[A-Za-z\d!@#$%^&*()_+\-=[\]{}|;:',.<>/?~]+$/,
    {
      message:
        'A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um símbolo',
    },
  )
  senha?: string;
  */
}