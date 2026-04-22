import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRespostaDto {
  @ApiPropertyOptional({
    description: 'Descrição da resposta',
    example: 'Tiago, Pedro, João, Judas - Atualizado',
  })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({
    description: 'ID do tipo de resposta',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  tipoRespostaId?: number;

  @ApiPropertyOptional({
    description: 'ID da pergunta à qual esta resposta pertence',
    example: 1115,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  perguntaId?: number;
}
