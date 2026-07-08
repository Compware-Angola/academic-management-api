import { Type } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  IsDateString,
  IsNotEmpty,
  ValidateNested,
  MaxLength,
  Matches,
} from 'class-validator';

export class CriarPessoaParaDocenteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nomeCompleto: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nomePai: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nomeMae: string;

  @IsOptional()
  @IsDateString()
  dataDeNascimento?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^\d{9}[A-Za-z]{2}\d{3}$/, {
    message:
      'numDocIdentificacao deve seguir o padrão do BI angolano: 9 dígitos, 2 letras, 3 dígitos (ex: 123456789LA042)',
  })
  numDocIdentificacao: string;

  @IsOptional()
  @IsNumber()
  tipoDocumentoId?: number;

  @IsOptional()
  @IsDateString()
  dataDeEmissaoDocumento?: string;

  @IsOptional()
  @IsDateString()
  dataDeExpiracaoDocumento?: string;

  @IsOptional()
  @IsNumber()
  sexoId?: number;

  @IsOptional()
  @IsNumber()
  nacionalidadeId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  endereco?: string;

  @IsOptional()
  @IsNumber()
  naturalidadeId?: number;

  @IsOptional()
  @IsNumber()
  estadoCivilId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefone1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefone2?: string;

  @IsEmail()
  @MaxLength(50)
  email: string;
}

export class CriarCandidaturaParaDocenteDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  apreciacao?: string;

  @IsOptional()
  @IsNumber()
  grauAcademico?: number;

  @IsOptional()
  @IsNumber()
  canal?: number;

  @IsOptional()
  @IsNumber()
  codigoMotivo?: number;

  @IsOptional()
  @IsNumber()
  fkEstadoCandidatura?: number;

  @IsOptional()
  @IsNumber()
  faculdade?: number;

  @IsOptional()
  @IsDateString()
  dataInicioExperiencia?: string;

  @IsOptional()
  @IsDateString()
  dataFimExperiencia?: string;
}

export class CriarDocenteDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  apreciacao?: string;

  @IsOptional()
  @IsNumber()
  fkEscalao?: number;

  @IsOptional()
  @IsNumber()
  tbCategoriaDocente?: number;

  @IsOptional()
  @IsNumber()
  faculdade?: number;

  @IsOptional()
  @IsString()
  mecanografico?: string;

  @IsOptional()
  @IsNumber()
  valorHora?: number;

  @IsOptional()
  @IsNumber()
  totalAnoExperiencia?: number;

  @IsOptional()
  @IsDateString()
  dataInicioDocencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  propostaDeContratacao?: string;

  @IsOptional()
  @IsNumber()
  codContrato?: number;
}

export class CriarDocenteCompletoDto {
  @ValidateNested()
  @Type(() => CriarPessoaParaDocenteDto)
  @IsNotEmpty()
  pessoa: CriarPessoaParaDocenteDto;

  @ValidateNested()
  @Type(() => CriarCandidaturaParaDocenteDto)
  @IsNotEmpty()
  candidatura: CriarCandidaturaParaDocenteDto;

  @ValidateNested()
  @Type(() => CriarDocenteDto)
  @IsNotEmpty()
  docente: CriarDocenteDto;
}

export class CriarDocenteCompletoResponseDto {
  message: string;
  pessoaId: number;
  utilizadorId: number;
  candidaturaId: number;
  docenteId: number;
  username: string;
  senhaTemporariaGerada: boolean;
  observacao: string;
}
