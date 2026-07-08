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
} from 'class-validator';

export class CriarPessoaParaDocenteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nomeCompleto: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  numDocIdentificacao: string;

  @IsEmail()
  @MaxLength(50)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefone1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefone2?: string;

  @IsOptional()
  @IsDateString()
  dataDeNascimento?: string;

  @IsOptional()
  @IsNumber()
  tipoDocumentoId?: number;

  @IsOptional()
  @IsNumber()
  sexoId?: number;

  @IsOptional()
  @IsNumber()
  estadoCivilId?: number;

  @IsOptional()
  @IsNumber()
  nacionalidadeId?: number;
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
