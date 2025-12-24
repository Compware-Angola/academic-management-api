// src/users/dto/update-password.dto.ts
import { IsNotEmpty, IsString, MinLength, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto {
  @ApiProperty({ example: 123, description: 'ID do utilizador (PK_UTILIZADOR)' })
  @IsInt()
  @IsNotEmpty()
  utilizadorId: number;

  @ApiProperty({ example: 'novaSenha@2025', minLength: 8, description: 'Nova senha' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  novaSenha: string;
}