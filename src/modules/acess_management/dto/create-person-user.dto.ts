
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Validate,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsAtLeastYearsOld } from 'src/common/validators/is-at-least-years-old.validator';
import { IsValidDocNumber } from 'src/common/validators/is-valid-doc-number.validator';

export class CreatePersonUserDto {
  @ApiProperty({ example: 'João António da Silva' })
  @IsNotEmpty()
  @IsString()
  nomeCompleto: string;

  @ApiProperty({
    example: '001234567LA047',
    description:
      'Número do documento. O formato varia conforme o tipoDocumentoId: ' +
      'BI (1): 9 dígitos + 2 letras + 3 dígitos | ' +
      'Passaporte (2): 1-2 letras + 6-7 dígitos | ' +
      'Outros: alfanumérico',
  })
  @IsNotEmpty()
  @IsString()
  @Validate(IsValidDocNumber, {
    message: 'Número de documento inválido para o tipo de documento selecionado',
  })
  numDocIdentificacao: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  tipoDocumentoId: number;

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
  @Matches(/^(\+244)?9\d{8}$/, {
    message:
      'O telefone deve ter 9 dígitos começando com 9, podendo incluir o prefixo +244 (ex: 912345678 ou +244912345678)',
  })
  telefone1?: string;

  @ApiProperty({ example: '987654321', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^(\+244)?9\d{8}$/, {
    message:
      'O telefone deve ter 9 dígitos começando com 9, podendo incluir o prefixo +244 (ex: 912345678 ou +244912345678)',
  })
  telefone2?: string;
}