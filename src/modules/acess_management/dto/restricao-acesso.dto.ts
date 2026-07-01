import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RestricaoAcessoDto {
  @ApiProperty({
    example: 123,
    description: 'Código do acesso (PK_ACESSO na tabela de acessos)',
  })
  @Type(() => Number)
  @IsInt()
  codigoAcesso: number;

  @ApiProperty({
    example: 456,
    description:
      'Código do utilizador (PK_UTILIZADOR na tabela de utilizadores)',
  })
  @Type(() => Number)
  @IsInt()
  codigoUtilizador: number;
}
