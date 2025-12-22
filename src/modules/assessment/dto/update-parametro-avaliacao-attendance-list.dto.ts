// update-parametro-avaliacao-attendance-list.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsInt, ValidateIf } from 'class-validator';

export class UpdateParametroAvaliacaoAttendanceListDto {
  @ApiPropertyOptional({
    description: 'Descrição do parâmetro',
    example: 'Presença em aulas',
  })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({
    description: 'Observação geral',
    example: 'Controlo de assiduidade',
  })
  @IsOptional()
  @IsString()
  observacao?: string;

  @ApiPropertyOptional({
    description: 'PK do utilizador que atualizou o parâmetro (será convertido para JSON {"pk": valor})',
    example: 33,
    type: 'integer',
  })
  @IsOptional()
  @IsInt()
  observacao2?: number | null;

  @ApiPropertyOptional({
    description: 'Observação adicional 3',
    example: 'Aplicável apenas a módulos teóricos',
  })
  @IsOptional()
  @IsString()
  observacao3?: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada do parâmetro',
    example: 'Registo de presença nas aulas',
  })
  @IsOptional()
  @IsString()
  descricaoParametro?: string;

  @ApiPropertyOptional({
    description: 'Módulo associado',
    example: 'TEORICA',
  })
  @IsOptional()
  @IsString()
  modulo?: string;

  @ApiPropertyOptional({
    description: 'Estado do parâmetro (ativo/inativo)',
    example: 1,
   
  })
  @IsOptional()

  activo?: number;
}