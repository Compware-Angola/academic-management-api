// src/acessos/dto/acesso.response.dto.ts
import { Expose } from 'class-transformer';
import { IsBoolean, IsDate, IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO de resposta para acessos (retornado pela API)
 * 
 * @example
 * {
 *   "id": 42,
 *   "designacao": "Acesso ao Módulo de Faturação",
 *   "sigla": "FAT_ACC",
 *   "moduloId": 3,
 *   "moduloNome": "Faturação e Cobrança",
 *   "tipoAcesso": "Leitura e Escrita",
 *   "ativo": true,
 *   "dataAtivacao": "2024-06-15T10:30:00.000Z"
 * }
 */
export class AcessoResponseDto {
  @ApiProperty({
    description: 'Identificador único do acesso (chave primária)',
    example: 42,
  })
  @Expose()
  @IsNumber()
  id: number;                // ← renomeado para "id" (padrão API)

  @ApiProperty({
    description: 'Nome/descrição completa do acesso',
    example: 'Acesso ao Módulo de Faturação',
  })
  @Expose()
  @IsString()
  designacao: string;

  @ApiProperty({
    description: 'Sigla/código curto do acesso',
    example: 'FAT_ACC',
  })
  @Expose()
  @IsString()
  sigla: string;

  @ApiProperty({
    description: 'ID do módulo ao qual o acesso pertence',
    example: 3,
  })
  @Expose()
  @IsNumber()
  moduloId: number;

  @ApiProperty({
    description: 'Nome do módulo associado',
    example: 'Faturação e Cobrança',
  })
  @Expose()
  @IsString()
  moduloNome: string;

  @ApiProperty({
    description: 'Tipo/descrição do acesso (ex: Leitura, Escrita, Admin)',
    example: 'Leitura e Escrita',
  })
  @Expose()
  @IsString()
  tipoAcesso: string;

  @ApiProperty({
    description: 'Indica se o acesso está ativo (1 = ativo, 0 = inativo)',
    example: true,
    type: Boolean,
  })
  @Expose()
  @IsBoolean()
  ativo: boolean;           // ← transformado para boolean (mais amigável na API)

  @ApiPropertyOptional({
    description: 'Data de ativação do acesso',
    example: '2024-06-15T10:30:00.000Z',
    nullable: true,
  })
  @Expose()
  @IsDate()
  @IsOptional()
  dataAtivacao?: Date;

  /**
   * Construtor para mapear resultado raw do banco → DTO
   * @param data Objeto com dados vindos da query (geralmente row do result set)
   */
  constructor(data: Partial<AcessoResponseDto> | any = {}) {
    this.id           = Number(data.PK_ACESSO ?? data.pk_Acesso ?? data.id);
    this.designacao   = String(data.DESIGNACAO ?? data.designacao ?? '');
    this.sigla        = String(data.SIGLA ?? data.sigla ?? '');
    this.moduloId     = Number(data.MODULOID ?? data.moduloId ?? null);
    this.moduloNome   = String(data.MODULONOME ?? data.moduloNome ?? '');
    this.tipoAcesso   = String(data.TIPOACESSO ?? data.tipoAcesso ?? '');
    
    // Converte 1/0 para true/false (mais natural na API)
    this.ativo        = data.ATIVO === 1 || data.ativo === true || data.activeState === 1;
    
    // Trata data (pode vir como string do Oracle)
    this.dataAtivacao = data.DATAATIVACAO 
      ? new Date(data.DATAATIVACAO) 
      : undefined;
  }
}