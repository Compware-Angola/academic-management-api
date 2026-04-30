import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEmail,
    IsDateString,
    IsNumber,
} from 'class-validator';

export class CreatePreRegistrationDto {

    // === Dados da Inscrição ===
    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsNumber()
    naturazaInscricao?: number;

    @ApiProperty({ example: 10 })
    @IsNotEmpty()
    @IsNumber()
    cursoCandidatura: number;

    @ApiPropertyOptional({ example: 2 })
    @IsOptional()
    @IsNumber()
    modalidadeFrequencia?: number;

    // === Dados Pessoais ===
    @ApiProperty({ example: 'Maria Antónia dos Santos' })
    @IsNotEmpty()
    @IsString()
    nomeCompleto: string;

    @ApiProperty({ example: '005678912LA045' })
    @IsNotEmpty()
    @IsString()
    bilheteIdentidade: string;

    @ApiPropertyOptional({ example: '2020-05-10' })
    @IsOptional()
    @IsDateString()
    dataEmissaoBI?: string;

    @ApiPropertyOptional({ example: '2030-05-10' })
    @IsOptional()
    @IsDateString()
    dataValidadeBI?: string;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsNumber()
    localEmissaoBI?: number;

    @ApiProperty({ example: '1234567890' })
    @IsNotEmpty()
    @IsString()
    numeroIdentificacaoFiscal: string;

    @ApiProperty({ example: 'Feminino' })
    @IsNotEmpty()
    @IsString()
    sexo: string;

    @ApiProperty({ example: '1998-12-25' })
    @IsNotEmpty()
    @IsDateString()
    dataNascimento: string;

    @ApiPropertyOptional({ example: 'Solteiro(a)' })
    @IsOptional()
    @IsString()
    estadoCivil?: string;

    @ApiProperty({ example: '+244923456789' })
    @IsNotEmpty()
    @IsString()
    contactosTelefonicos: string;

    @ApiPropertyOptional({ example: '+244923000111' })
    @IsOptional()
    @IsString()
    contactoDeEmergencia?: string;

    @ApiProperty({ example: 'Rua 17, Bairro Nova Vida, Luanda' })
    @IsNotEmpty()
    @IsString()
    moradaCompleta: string;

    @ApiProperty({ example: 'maria.santos@gmail.com' })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiPropertyOptional({ example: 'Pai' })
    @IsOptional()
    @IsString()
    nomePessoaContactoTelefone?: string;

    // === Formação ===
    @ApiPropertyOptional({ example: 5 })
    @IsOptional()
    @IsNumber()
    instituicaoFormacaoAcesso?: number;

    @ApiPropertyOptional({ example: '2022-07-15' })
    @IsOptional()
    @IsDateString()
    dataConclusao?: string;

    @ApiPropertyOptional({ example: 14.5 })
    @IsOptional()
    @IsNumber()
    mediaFinal?: number;

    @ApiPropertyOptional({ example: '12345' })
    @IsOptional()
    @IsString()
    numeroOrdemMedicos?: string;

    // === Profissional ===
    @ApiPropertyOptional({ example: 'Hospital Josina Machel' })
    @IsOptional()
    @IsString()
    instituicaoExerceFuncao?: string;

    @ApiPropertyOptional({ example: '2023-01-10' })
    @IsOptional()
    @IsDateString()
    dataInicioTrabalho?: string;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsNumber()
    provinciaTrabalho?: number;

    // === Família ===
    @ApiPropertyOptional({ example: 'João Manuel dos Santos' })
    @IsOptional()
    @IsString()
    pai?: string;

    @ApiPropertyOptional({ example: 'Ana Paula dos Santos' })
    @IsOptional()
    @IsString()
    mae?: string;

    @ApiPropertyOptional({ example: 'Luanda' })
    @IsOptional()
    @IsString()
    naturalidade?: string;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsNumber()
    codigoNacionalidade?: number;

    @ApiPropertyOptional({ example: 2 }) @IsOptional() @IsNumber() ocupacaoPai?: number;
    @ApiPropertyOptional({ example: 3 }) @IsOptional() @IsNumber() ocupacaoMae?: number;
    @ApiPropertyOptional({ example: 0 }) @IsOptional() @IsNumber() ocupacaoConjuge?: number;

    @ApiPropertyOptional({ example: 10 }) @IsOptional() @IsNumber() profissaoPai?: number;
    @ApiPropertyOptional({ example: 11 }) @IsOptional() @IsNumber() profissaoMae?: number;
    @ApiPropertyOptional({ example: 0 }) @IsOptional() @IsNumber() profissaoConjuge?: number;

    @ApiPropertyOptional({ example: 4 }) @IsOptional() @IsNumber() grauAcademicoPai?: number;
    @ApiPropertyOptional({ example: 4 }) @IsOptional() @IsNumber() grauAcademicoMae?: number;
    @ApiPropertyOptional({ example: 0 }) @IsOptional() @IsNumber() grauAcademicoConjuge?: number;

    // === Outros ===
    @ApiPropertyOptional({ example: 2026 })
    @IsOptional()
    @IsNumber()
    anoLectivo?: number;

    @ApiPropertyOptional({ example: 'Luanda' })
    @IsOptional()
    @IsString()
    provinciaOrigem?: string;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsNumber()
    deslocadoPermanente?: number;

    @ApiPropertyOptional({ example: 2 })
    @IsOptional()
    @IsNumber()
    necessidadeEspecialId?: number;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsNumber()
    canal?: number;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsNumber()
    codigoTipoCandidatura?: number;

    @ApiPropertyOptional({ example: 2 })
    @IsOptional()
    @IsNumber()
    codigoFormaIngresso?: number;

    // === Sistema ===
    @ApiPropertyOptional({ example: 1001 })
    @IsOptional()
    @IsNumber()
    codigoUsuario?: number;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsNumber()
    estado?: number;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsNumber()
    poloId?: number;

    @ApiPropertyOptional({ example: 20 })
    @IsOptional()
    @IsNumber()
    cursoOpcional1Id?: number;

    @ApiPropertyOptional({ example: 30 })
    @IsOptional()
    @IsNumber()
    cursoOpcional2Id?: number;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @IsNumber()
    permitirInscricao?: number;

    @ApiPropertyOptional({ example: '2026-04-28 17:00:00' })
    @IsOptional()
    @IsString()
    dataPreescricao?: string;
}