// src/modules/acess_management/groups/dto/groups.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GroupsDto {
  @ApiProperty({ description: 'Nome do grupo', example: 'Desenvolvedores' })
  @IsNotEmpty()
  @IsString()
  designacao: string;

  @ApiPropertyOptional({ description: 'Descrição do grupo', example: 'Grupo responsável pelo desenvolvimento de sistemas' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({ description: 'Sigla do grupo', example: 'DEV' })
  @IsOptional()
  @IsString()
  sigla?: string;

  @ApiProperty({ description: 'ID do tipo de grupo', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  fkTipoDeGrupo: number;

  @ApiPropertyOptional({ description: 'Observações sobre o grupo', example: 'Grupo interno' })
  @IsOptional()
  @IsString()
  obs?: string;

  @ApiPropertyOptional({ description: 'Ordem do grupo', example: 10 })
  @IsOptional()
  @IsNumber()
  ordem?: number;

  @ApiPropertyOptional({ description: 'Módulos associados ao grupo', example: 'mod1, mod2' })
  @IsOptional()
  @IsString()
  modulos?: string;

  @ApiPropertyOptional({ description: 'Estado ativo do grupo (1 = ativo, 0 = inativo)', example: 1 })
  @IsOptional()
  @IsNumber()
  active_state?: number;
}
