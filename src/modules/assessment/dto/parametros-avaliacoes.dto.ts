// parametros-avaliacoes-mutue.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateParametroAvaliacaoMutueDto {
  @ApiProperty({
    description: 'Descrição do parâmetro de avaliação mútua',
    example: 'Pontualidade no trabalho',
  })
  @IsString()
  descricao: string;

  @ApiPropertyOptional({
    description: 'Observação adicional 1',
    example:3,
  })
  @IsOptional()

  observacao1?: number;

  @ApiPropertyOptional({
    description: 'Observação adicional',
    example: 1,
  })
  @IsOptional()

  observacao?: number;

  @ApiPropertyOptional({
    description: 'Informação adicional 1',
    example: 'Info útil 1',
  })
  @IsOptional()
  @IsString()
  info1?: string;

  @ApiPropertyOptional({
    description: 'Informação adicional 2',
    example: 'Info útil 2',
  })
  @IsOptional()
  @IsString()
  info2?: string;

  @ApiPropertyOptional({
    description: 'Informação adicional 3',
    example: 'Info útil 3',
  })
  @IsOptional()
  @IsString()
  info3?: string;

  @ApiPropertyOptional({
    description: 'Indica se o parâmetro está ativo',
    example: 1,
  
  })
  @IsOptional()
 
  activo?: number = 1; 

  @ApiPropertyOptional({
    description: 'Função associada ao parâmetro',
    example: 'avaliador',
  })
  @IsOptional()
  @IsString()
  funcao?: string;
}

export class UpdateParametroAvaliacaoMutueDto extends CreateParametroAvaliacaoMutueDto {
 
}