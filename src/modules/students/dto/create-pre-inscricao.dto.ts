import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEmail,
    IsDateString,
    IsNumber,
    IsBoolean,
} from 'class-validator';

export class CreatePreRegistrationDto {
    // === Dados da Inscrição ===
    @ApiPropertyOptional({ example: 'NATURAZA_INSCRICAO' })
    @IsOptional()
    @IsString()
    naturazaInscricao?: string;

    @ApiProperty({ example: 'Enfermagem' })
    @IsNotEmpty()
    @IsString()
    cursoCandidatura: string;

    @ApiPropertyOptional({ example: 'Presencial' })
    @IsOptional()
    @IsString()
    modalidadeFrequencia?: string;

    // === Dados Pessoais ===
    @ApiProperty({ example: 'Maria Antónia dos Santos' })
    @IsNotEmpty()
    @IsString()
    nomeCompleto: string;

    @ApiProperty({ example: '005678912LA045' })
    @IsNotEmpty()
    @IsString()
    bilheteIdentidade: string;

    @ApiPropertyOptional({ example: '2021-05-10' })
    @IsOptional()
    @IsDateString()
    dataEmissaoBI?: string;

    @ApiPropertyOptional({ example: '2031-05-10' })
    @IsOptional()
    @IsDateString()
    dataValidadeBI?: string;

    @ApiPropertyOptional({ example: 'Luanda' })
    @IsOptional()
    @IsString()
    localEmissaoBI?: string;

    @ApiProperty({ example: '1234567890123' })
    @IsNotEmpty()
    @IsString()
    numeroIdentificacaoFiscal: string; // NIF

    @ApiProperty({ example: 'Feminino', enum: ['Masculino', 'Feminino', 'Outro'] })
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

    @ApiProperty({ example: '+244 923 456 789' })
    @IsNotEmpty()
    @IsString()
    contactosTelefonicos: string;

    @ApiPropertyOptional({ example: '+244 923 000 111' })
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

    @ApiPropertyOptional({ example: 'Pai ou Mãe' })
    @IsOptional()
    @IsString()
    nomePessoaContactoTelefone?: string;

    // === Formação Anterior ===
    @ApiPropertyOptional({ example: 'Instituto Médio de Saúde' })
    @IsOptional()
    @IsString()
    instituicaoFormacaoAcesso?: string;

    @ApiPropertyOptional({ example: '2022-07-15' })
    @IsOptional()
    @IsDateString()
    dataConclusao?: string;

    @ApiPropertyOptional({ example: '14.5' })
    @IsOptional()
    @IsString()
    mediaFinal?: string;

    @ApiPropertyOptional({ example: '12345' })
    @IsOptional()
    @IsString()
    numeroOrdemMedicos?: string;

    // === Dados Profissionais ===
    @ApiPropertyOptional({ example: 'Hospital Josina Machel' })
    @IsOptional()
    @IsString()
    instituicaoExerceFuncao?: string;

    @ApiPropertyOptional({ example: '2023-01-10' })
    @IsOptional()
    @IsDateString()
    dataInicioTrabalho?: string;

    @ApiPropertyOptional({ example: 'Luanda' })
    @IsOptional()
    @IsString()
    provinciaTrabalho?: string;

    // === Pais e Família ===
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

    @ApiPropertyOptional({ example: 'AO' })
    @IsOptional()
    @IsString()
    codigoNacionalidade?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    ocupacaoPai?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    ocupacaoMae?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    ocupacaoConjuge?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    profissaoPai?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    profissaoMae?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    profissaoConjuge?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    grauAcademicoPai?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    grauAcademicoMae?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    grauAcademicoConjuge?: string;

    // === Outros campos importantes ===
    @ApiPropertyOptional({ example: '2026-1' })
    @IsOptional()
    @IsString()
    anoLectivo?: string;

    @ApiPropertyOptional({ example: 'Luanda' })
    @IsOptional()
    @IsString()
    provinciaOrigem?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    deslocadoPermanente?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    necessidadeEspecialId?: number;

    @ApiPropertyOptional({ example: 'Online' })
    @IsOptional()
    @IsString()
    canal?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    codigoTipoCandidatura?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    codigoFormaIngresso?: number;

    // Campos de controle do sistema (geralmente opcionais no cadastro)
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    codigoUsuario?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    estado?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    poloId?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    cursoOpcional1Id?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    cursoOpcional2Id?: number;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    permitirInscricao?: boolean;

    @ApiPropertyOptional({ example: '2026-04-28T17:00:00Z' })
    @IsOptional()
    @IsDateString()
    dataPreescricao?: string;
}