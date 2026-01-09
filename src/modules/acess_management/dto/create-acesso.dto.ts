import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAcessoDto {
  @ApiProperty({ description: 'Designação/nome visível do acesso' })
  @IsString()
  @IsNotEmpty()
  designacao: string;

  @ApiPropertyOptional({ description: 'Descrição detalhada do acesso' })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiProperty({ description: 'Sigla única do acesso (deve ser única no sistema)' })
  @IsString()
  @IsNotEmpty()
  sigla: string;

  @ApiPropertyOptional({ description: 'Nome do ícone (ex: Ant Design, FontAwesome)' })
  @IsString()
  @IsOptional()
  icone?: string;

  @ApiPropertyOptional({ description: 'ID do módulo ao qual o acesso pertence' })
  @IsInt()
  @IsOptional()
  fkModulo?: number;

  @ApiPropertyOptional({ description: 'ID do submenu associado (opcional)' })
  @IsInt()
  @IsOptional()
  fkSubmenu?: number;

  @ApiPropertyOptional({ description: 'ID da página específica (opcional)' })
  @IsInt()
  @IsOptional()
  fkPagina?: number;

  @ApiPropertyOptional({ description: 'ID do tipo de acesso (ex: leitura, escrita, etc.)' })
  @IsInt()
  @IsOptional()
  fkTipoAcesso?: number;

  @ApiPropertyOptional({ description: 'Observações internas sobre o acesso' })
  @IsString()
  @IsOptional()
  obs?: string;

  @ApiPropertyOptional({ description: 'Ordem de exibição no menu/sistema' })
  @IsInt()
  @IsOptional()
  ordem?: number;

  @ApiPropertyOptional({ description: 'Data de ativação do acesso (formato ISO)' })
  @IsDateString()
  @IsOptional()
  activeDate?: string;

  @ApiPropertyOptional({ description: 'Estado ativo/inativo do acesso (1 = ativo, 0 = inativo)' })
  @IsBoolean()
  @IsOptional()
  activeState?: boolean;
}