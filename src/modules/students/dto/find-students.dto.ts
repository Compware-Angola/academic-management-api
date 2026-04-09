// src/horarios/dto/listar-horarios.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Min,
  IsNumber,
  IsPositive,
  IsIn,
  Max,
  IsString,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';

export class FindStudentsDTO {
  @ApiProperty({
    description: 'Ano letivo obrigatório',
    example: 21,
    minimum: 1,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  anoLectivo?: number;

  @ApiProperty({
    description: 'Codigo do Curso',
    example: 6,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoCurso: number;

  @ApiProperty({
    description: 'Codigo da Faculdade',
    example: 1,
    required: false,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  faculdadeId: number;

  @ApiPropertyOptional({
    description: 'Filtrar por Unidade Curricular',
    example: 486,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoMatricula?: number;

  @ApiPropertyOptional({
    description: 'Número da página',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página (máximo 100)',
    example: 25,
    minimum: 1,
    maximum: 100,
    default: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 25;
}

export class ResetStudentPasswordDTO {
  @ApiProperty({
    description: 'Codigo da Matricula',
    example: 1,
    required: true,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  codigoMatricula: number;

  @ApiProperty({
    description: 'Senha do utilizador',
    example: '123456',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  senha: string;
}

export class UpdateStudentContactDTO {
  @ApiProperty({
    description: 'Codigo da Matricula',
    example: 1,
    required: true,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  codigoMatricula: number;

  @ApiPropertyOptional({
    description: 'Email do estudante',
    example: 'estudante@email.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Type(() => String)
  email: string;

  @ApiPropertyOptional({
    description: 'Contacto do estudante',
    example: '923456789',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Type(() => String)
  contacto: string;

  @ApiPropertyOptional({
    description: 'Contacto alternativo do estudante',
    example: '923456789',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Type(() => String)
  contactoAlternativo: string;
}

export class UpdateStudentPersonalDataDTO {
  @ApiProperty({
    description: 'Codigo da Matricula',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  codigoMatricula: number;

  @ApiPropertyOptional({ description: 'Nome Completo' })
  @IsString()
  @IsOptional()
  nomeCompleto?: string;

  @ApiPropertyOptional({ description: 'Data de Nascimento (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  dataNascimento?: string;

  @ApiPropertyOptional({ description: 'Gênero/Sexo' })
  @IsString()
  @IsOptional()
  genero?: string;

  @ApiPropertyOptional({ description: 'Número do BI' })
  @IsString()
  @IsOptional()
  numeroBI?: string;

  @ApiPropertyOptional({ description: 'Data de Emissão BI' })
  @IsDateString()
  @IsOptional()
  dataEmissao?: string;

  @ApiPropertyOptional({ description: 'Data de Validade BI' })
  @IsDateString()
  @IsOptional()
  dataValidade?: string;

  @ApiPropertyOptional({ description: 'Nacionalidade' })
  @IsString()
  @IsOptional()
  nacionalidade?: string;

  @ApiPropertyOptional({ description: 'Nome do Pai' })
  @IsString()
  @IsOptional()
  nomePai?: string;

  @ApiPropertyOptional({ description: 'Nome da Mãe' })
  @IsString()
  @IsOptional()
  nomeMae?: string;

  @ApiPropertyOptional({ description: 'Código da Profissão' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  profissao?: number;

  @ApiPropertyOptional({ description: 'Código da Ocupação' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  ocupacao?: number;

  @ApiPropertyOptional({ description: 'Naturalidade' })
  @IsString()
  @IsOptional()
  naturalidade?: string;

  @ApiPropertyOptional({ description: 'Morada Completa' })
  @IsString()
  @IsOptional()
  morada?: string;
}
