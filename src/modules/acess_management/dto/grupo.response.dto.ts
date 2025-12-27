// src/grupos/dto/grupo.response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class GrupoResponseDto {
  @ApiProperty({ example: 456 })
  pkGrupo: number;

  @ApiProperty({ example: 'Administradores' })
  designacao: string;

  @ApiProperty({ example: 'ADM' })
  sigla: string;

  @ApiProperty({ example: 1 })
  fkTipoDeGrupo: number;

  @ApiProperty({ example: true })
  activeState: boolean;

  constructor(data: any) {
    this.pkGrupo = data.PK_GRUPO;
    this.designacao = data.DESIGNACAO;
    this.sigla = data.SIGLA;
    this.fkTipoDeGrupo = data.FK_TIPO_DE_GRUPO;
    this.activeState = !!data.ACTIVE_STATE;
  }
}

// src/grupos/dto/filter-grupo.dto.ts
import { IsOptional, IsBooleanString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterGrupoDto {
  @ApiPropertyOptional({
    description: 'Filtrar apenas grupos ativos (true) ou inativos (false). Omitir = todos',
    example: 'true',
  })
  @IsOptional()
  @IsBooleanString()
  ativo?: string;
}