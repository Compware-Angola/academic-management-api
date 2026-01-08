import { IsInt, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AprovarEncaminhamentoSolicitacaoDTO {
  @ApiPropertyOptional({ description: 'SolicitacaoId', example: 154 })
  @IsInt()
  @Type(() => Number)
  solicitacaoId: number;

  @ApiPropertyOptional({
    description: 'Utilizador que fez a aprovação',
    example: 146,
  })
  @IsInt()
  @Type(() => Number)
  userId: number;

  @ApiPropertyOptional({ description: 'Descrição', example: 'Obra do Luciano' })
  @IsString()
  descricao: string;
}
