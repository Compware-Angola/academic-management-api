import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePerguntaDto {
  @ApiPropertyOptional({
    example: 'Essa é uma pergunta de exemplo? -atualizado',
  })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({
    example: 9,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  disciplinaId: number;

  @ApiPropertyOptional({
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  tipoPerguntaId: number;

  @ApiPropertyOptional({
    example: 1,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'A cotação deve ter no máximo 2 casas decimais' },
  )
  @Min(1)
  cotacao: number;
}
