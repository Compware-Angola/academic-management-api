import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export enum AvisoImagemSigla {
  PORTAL_ESTUDANTE = 'PORTAL_ESTUDANTE',
  LOGIN_GA = 'LOGIN_GA',
  COMUNICADO_PORTAL = 'COMUNICADO_PORTAL',
}

export class UpdateAvisoImagemDto {
  @ApiProperty({
    description: 'Nome do ficheiro devolvido pelo serviço de upload',
    example: 'imagem-login-ga-123456.png',
  })
  @IsString()
  @IsNotEmpty()
  filename: string;
}
