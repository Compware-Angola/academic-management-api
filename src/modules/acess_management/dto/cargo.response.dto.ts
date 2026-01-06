// src/cargos-administrativos/dto/cargo.response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CargoResponseDto {
  @ApiProperty({
    description: 'Identificador único do cargo (chave primária)',
    example: 123,
  })
  pkCargo: number;

  @ApiProperty({
    description: 'ID do tipo de cargo administrativo',
    example: 10,
  })
  fkTipoCargo: number;

  @ApiPropertyOptional({
    description: 'Descrição/nome do tipo de cargo (ex: Decano, Director, Coordenador)',
    example: 'Decano',
  })
  tipoCargoDescricao?: string;

  @ApiProperty({
    description: 'ID do utilizador que ocupa o cargo',
    example: 456,
  })
  fkUtilizador: number;

  @ApiPropertyOptional({
    description: 'Nome completo do utilizador ocupante',
    example: 'Maria Silva',
  })
  utilizadorNome?: string;

  @ApiPropertyOptional({
    description: 'ID da faculdade associada ao cargo (quando aplicável, ex: Decano)',
    example: 5,
    nullable: true,
  })
  fkFaculdade?: number;

  @ApiPropertyOptional({
    description: 'Nome/designação da faculdade',
    example: 'Engenharia e Arquitetura',
    nullable: true,
  })
  faculdadeNome?: string;

  @ApiPropertyOptional({
    description: 'ID do curso associado ao cargo (quando aplicável, ex: Director/Coordenador)',
    example: 78,
    nullable: true,
  })
  fkCurso?: number;

  @ApiPropertyOptional({
    description: 'Nome/designação do curso',
    example: 'Engenharia Informática',
    nullable: true,
  })
  cursoNome?: string;

  @ApiProperty({
    description: 'Indica se o cargo está ativo (1 = ativo, 0 = inativo)',
    example: true,
  })
  active: boolean;

  @ApiProperty({
    description: 'Data de criação do registro do cargo',
    example: '2025-10-15T14:30:00.000Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Informação de quem criou o registro (geralmente string JSON com ID e nome)',
    example: '{"pk":1,"desc":"Admin"}',
    nullable: true,
  })
  createdBy?: string;

  constructor(row: any) {
    this.pkCargo = row.PK_CARGO;
    this.fkTipoCargo = row.FK_TIPO_CARGO;
    this.tipoCargoDescricao = row.TIPO_CARGO_DESCRICAO; // virá de join se necessário
    this.fkUtilizador = row.FK_UTILIZADOR;
    this.utilizadorNome = row.UTILIZADOR_NOME; // virá de join se necessário
    this.fkFaculdade = row.FK_FACULDADE;
    this.faculdadeNome = row.FACULDADE_NOME;
    this.fkCurso = row.FK_CURSO;
    this.cursoNome = row.CURSO_NOME;
    this.active = row.ACTIVE === 1;
    this.createdAt = row.CREATED_AT;
    this.createdBy = row.CREATED_BY;
  }
}