import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRespostaDto {
  @ApiProperty({
    description: 'Descrição da resposta',
  })
  @IsNotEmpty({ message: 'A descrição é obrigatória' })
  @IsString()
  descricao: string;

  @ApiProperty({
    description:
      'ID do tipo de resposta (1 = Verdadeira, 2 = Verdadeira, 3 = Normal)',
    example: 1,
  })
  @IsNotEmpty({ message: 'O tipo de resposta é obrigatório' })
  @IsInt()
  @Min(1)
  tipoRespostaId: number;

  @ApiProperty({
    description: 'ID da pergunta à qual esta resposta pertence',
    example: 1115,
  })
  @IsNotEmpty({ message: 'O ID da pergunta é obrigatório' })
  @IsInt()
  @Min(1)
  perguntaId: number;
}
