import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PerguntaProvaDto {
  @ApiProperty({ description: 'ID da pergunta', example: 1 })
  @IsInt()
  @IsPositive()
  id: number;
}

