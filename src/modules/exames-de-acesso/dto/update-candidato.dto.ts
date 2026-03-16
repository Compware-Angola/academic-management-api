import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateCandidatoDto {
  @ApiPropertyOptional({
    description: 'Nome completo do pai do candidato',
    example: 'João da Silva',
  })
  @IsOptional()
  @IsString()
  nomePai?: string;

  @ApiPropertyOptional({
    description: 'Nome completo da mãe do candidato',
    example: 'Maria de Souza',
  })
  @IsOptional()
  @IsString()
  nomeMae?: string;

  @ApiPropertyOptional({
    description: 'Código da profissão do pai (FK2_TB_PROFISSAO.CODIGO)',
    example: 101,
  })
  @IsOptional()
  @IsNumber()
  codigoProfissaoPai?: number;

  @ApiPropertyOptional({
    description: 'Código da profissão da mãe (FK2_TB_PROFISSAO.CODIGO)',
    example: 202,
  })
  @IsOptional()
  @IsNumber()
  codigoProfissaoMae?: number;

  @ApiPropertyOptional({
    description: 'Código do curso de candidatura (FK2_TB_CURSOS.CODIGO)',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  codigoCurso?: number;

  @ApiPropertyOptional({
    description: 'Código do 1º curso opcional (FK2_TB_CURSOS.CODIGO)',
    example: 11,
  })
  @IsOptional()
  @IsNumber()
  codigoCursoOpcional1?: number;

  @ApiPropertyOptional({
    description: 'Código do 2º curso opcional (FK2_TB_CURSOS.CODIGO)',
    example: 12,
  })
  @IsOptional()
  @IsNumber()
  codigoCursoOpcional2?: number;

  @ApiPropertyOptional({
    description: 'Média final do candidato',
    example: 15.5,
  })
  @IsOptional()
  @IsNumber()
  mediaFinal?: number;

  @ApiPropertyOptional({
    description: 'Telefone principal do candidato',
    example: '+44912345678',
  })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional({
    description: 'Telefone de emergência',
    example: '244923111222',
  })
  @IsOptional()
  @IsString()
  telefoneEmergencia?: string;

  @ApiPropertyOptional({
    description: 'Email do candidato',
    example: 'candidato@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Morada completa do candidato',
    example: 'Rua X, nº 123, Bairro Y, Luanda',
  })
  @IsOptional()
  @IsString()
  morada?: string;

  @ApiPropertyOptional({
    description: 'Código do turno principal (FK2_TB_PERIODOS.CODIGO)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  codigoTurno?: number;

  @ApiPropertyOptional({
    description: 'Código do turno opcional (FK2_TB_PERIODOS.CODIGO)',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  codigoTurnoOpcional?: number;

  @ApiPropertyOptional({
    description: 'Código do tipo de candidatura (FK2_TB_TIPO_CANDIDATURA.ID)',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  codigoTipoCandidatura?: number;

  @ApiProperty({
    description: 'Código do candidato (FK2_TB_PREINSCRICAO.CODIGO)',
    example: 12345,
  })
  @IsNumber()
  codigoCandidato?: number;

  @ApiProperty({
    description: 'Atualizar a senha para o número de telefone do candidato',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  atualizarSenha?: boolean;
}
