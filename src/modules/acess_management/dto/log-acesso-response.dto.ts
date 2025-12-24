// src/logs/dto/log-acesso-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class LogAcessoResponseDto {
  @ApiProperty({ example: 1 })
  pkLogAcesso: number;

  @ApiProperty({ example: 'Criação de utilizador' })
  descricao: string;

  @ApiProperty({ example: 9 })
  fkAcesso: number;

  @ApiProperty({ example: 15 })
  fkFuncionalidade: number;

  @ApiProperty({ example: 5 })
  fkUtilizadorResponsavel: number;

  @ApiProperty({ example: null })
  fkGrupoAfetado: number | null;

  @ApiProperty({ example: 1 })
  fkOperacaoLog: number;

  @ApiProperty({ example: '2025-12-22T10:30:45.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '192.168.1.100' })
  ip: string;

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
  }
}