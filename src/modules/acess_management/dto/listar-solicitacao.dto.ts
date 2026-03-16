import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ListAllSolicitacoesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Estado da solicitação',
    example: 'Solicitações Respondidas',
  })
  @IsString()
  estadoSolicitacao: string;

  @ApiPropertyOptional({
    description: 'Código do tipo de serviço. Use 404 para todos',
    example: 404,
  })
  @Type(() => Number)
  @IsInt()
  tipoServicoSelecionado: number;

  @ApiPropertyOptional({
    description: 'ID do utilizador logado enviado pelo frontend',
    example: 12,
  })
  @Type(() => Number)
  @IsInt()
  userId: number;
}