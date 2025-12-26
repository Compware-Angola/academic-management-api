// src/users/dto/create-person-user-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreatePersonUserResponseDto {
  @ApiProperty({ example: 'Utilizador cadastrado com sucesso' })
  message: string;

  @ApiProperty({ example: 'joao.silva' })
  username: string;

  @ApiProperty({ example: true })
  senhaTemporariaGerada: boolean;

  @ApiProperty({ example: 'Recomende alterar a senha no primeiro acesso.' })
  observacao: string;
}