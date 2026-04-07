import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';

export class ListAllSolicitacoesDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'Solicitações Respondidas' })
  @IsString()
  estadoSolicitacao: string;

  @ApiPropertyOptional({ example: 404 })
  @Type(() => Number)
  @IsInt()
  tipoServicoSelecionado: number;

  @ApiPropertyOptional({ example: 2435 })
  @Type(() => Number)
  @IsInt()
  userId: number;

  @ApiPropertyOptional({ example: 'Reembolso de valor' })
  @IsString()
  searchServico?: string;
}