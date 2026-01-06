// src/users/dto/create-person-user.dto.ts
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
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

  @ApiProperty({ example: 1 }) // ID do sexo
  @IsInt()
  sexoId: number;

  @ApiProperty({ example: 2 }) // ID do estado civil
  @IsInt()
  estadoCivilId: number;

  @ApiProperty({ example: 1 }) // ID da nacionalidade
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
}