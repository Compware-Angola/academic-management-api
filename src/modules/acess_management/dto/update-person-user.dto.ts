// src/users/dto/update-person-user.dto.ts
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  Validate,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsAtLeastYearsOld } from 'src/modules/common/validators/is-at-least-years-old.validator';

export class UpdatePersonUserDto {
  @ApiPropertyOptional({ example: 'João António da Silva' })
  @IsOptional()
  @IsString()
  nomeCompleto?: string;

  @ApiPropertyOptional({ example: '001234567LA047' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{9}[A-Z]{2}\d{3}$/, {
    message:
      'O número de Bilhete de Identidade (BI) deve seguir o formato angolano: 9 dígitos + 2 letras maiúsculas + 3 dígitos (ex: 001234567LA047)',
  })
  numDocIdentificacao?: string;

  @ApiPropertyOptional({ example: 'joao.silva@email.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsString()
  @Validate(IsAtLeastYearsOld, [17], {
    message: 'O utilizador deve ter pelo menos 17 anos de idade',
  })
  dataDeNascimento?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  tipoDocumentoId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  sexoId?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  estadoCivilId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  nacionalidadeId?: number;

  @ApiPropertyOptional({ example: '912345678' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+244)?9\d{8}$/, {
    message:
      'O telefone deve ter 9 dígitos começando com 9, podendo incluir o prefixo +244 (ex: 912345678 ou +244912345678)',
  })
  telefone1?: string;

  @ApiPropertyOptional({ example: '987654321' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+244)?9\d{8}$/, {
    message:
      'O telefone deve ter 9 dígitos começando com 9, podendo incluir o prefixo +244 (ex: 912345678 ou +244912345678)',
  })
  telefone2?: string;

  /*
  @ApiPropertyOptional({
    example: 'SenhaForte@2025',
    minLength: 8,
    description:
      'Senha (mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 símbolo)',
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;:',.<>/?~]).+$/,
    {
      message:
        'A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um símbolo',
    },
  )
  senha?: string;
  */
}