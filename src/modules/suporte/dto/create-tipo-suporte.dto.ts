import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateTipoSuporteDto {
  @ApiProperty({ example: 'Dúvida Académica', description: 'Descrição do tipo de suporte' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  descricao: string;
}