// src/logs/dto/log-acesso-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LogAcessoResponseDto {
  @ApiProperty({ example: 12345, description: 'ID único do registo de log' })
  pkLogAcesso: number;

  @ApiPropertyOptional({
    example: 'Utilizador acedeu ao módulo de gestão de alunos',
    description: 'Descrição da ação realizada',
  })
  descricao?: string;

  @ApiPropertyOptional({ example: 42, description: 'ID do acesso relacionado' })
  fkAcesso?: number;

  @ApiProperty({ example: 18, description: 'ID da funcionalidade acessada' })
  fkFuncionalidade: number;

  @ApiProperty({ example: 1548, description: 'ID do utilizador que executou a ação' })
  fkUtilizadorResponsavel: number;

  @ApiPropertyOptional({
    example: null,
    description: 'ID do grupo afetado (pode ser null)',
  })
  fkGrupoAfetado?: number | null;

  @ApiProperty({ example: 3, description: 'ID do tipo de operação (login, insert, update...)' })
  fkOperacaoLog: number;

  @ApiProperty({
    example: '2025-12-22T10:30:45.000Z',
    description: 'Data e hora em que a ação ocorreu',
  })
  createdAt: Date;

  @ApiProperty({ example: '196.168.45.78', description: 'Endereço IP de origem' })
  ip: string;

  // Campos adicionais vindos dos LEFT JOINs
  @ApiPropertyOptional({
    example: 'João Silva',
    description: 'Nome completo do utilizador responsável',
  })
  nomeUtilizadorResponsavel?: string;

  @ApiPropertyOptional({
    example: 1548,
    description: 'Código/PK do utilizador responsável (redundante com fkUtilizadorResponsavel)',
  })
  codigoUtilizador?: number;

  @ApiPropertyOptional({
    example: 'Gestão de Turmas',
    description: 'Nome/designação da funcionalidade acessada',
  })
  nomeFuncionalidade?: string;

  @ApiPropertyOptional({
    example: 'Acesso total ao módulo de turmas',
    description: 'Designação/descrição do tipo de acesso',
  })
  designacaoAcesso?: string;

  constructor(data: any) {
    this.pkLogAcesso = data.PK_LOG_ACESSO;
    this.descricao = data.DESCRICAO;
    this.fkAcesso = data.FK_ACESSO;
    this.fkFuncionalidade = data.FK_FUNCIONALIDADE;
    this.fkUtilizadorResponsavel = data.FK_UTILIZADOR_RESPONSAVEL;
    this.fkGrupoAfetado = data.FK_GRUPO_AFETADO;
    this.fkOperacaoLog = data.FK_OPERACAO_LOG;
    this.createdAt = data.CREATED_AT;
    this.ip = data.IP;

    // Campos dos joins (podem vir undefined se LEFT JOIN retornar NULL)
    this.nomeUtilizadorResponsavel = data.NOME_UTILIZADOR_RESPONSAVEL;
    this.codigoUtilizador = data.CODIGO_UTILIZADOR;
    this.nomeFuncionalidade = data.NOME_FUNCIONALIDADE;
    this.designacaoAcesso = data.DESIGNACAO_ACESSO;
  }
}