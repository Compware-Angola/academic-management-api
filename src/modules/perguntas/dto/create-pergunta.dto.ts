import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePerguntaDto {
  @ApiProperty({
    example: 'Essa é uma pergunta de exemplo?',
  })
  @IsNotEmpty({ message: 'A descrição é obrigatória' })
  @IsString()
  descricao: string;

  @ApiProperty({
    example: 9,
  })
  @IsNotEmpty({ message: 'O id da disciplina é obrigatório' })
  @IsInt()
  @Min(1)
  disciplinaId: number;

  @ApiProperty({
    example: 1,
  })
  @IsNotEmpty({ message: 'O id do tipo pergunta é obrigatório' })
  @IsInt()
  @Min(1)
  tipoPerguntaId: number;

  @ApiProperty({
    example: 1,
  })
  @IsNotEmpty({ message: 'A cotação é obrigatória' })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'A cotação deve ter no máximo 2 casas decimais' },
  )
  @Min(1)
  cotacao: number;
}
