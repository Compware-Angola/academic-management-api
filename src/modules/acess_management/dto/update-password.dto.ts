
import { IsNotEmpty, IsString, MinLength, IsInt, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto {
  @ApiProperty({ example: 123, description: 'ID do utilizador (PK_UTILIZADOR)' })
  @IsInt()
  @IsNotEmpty()
  utilizadorId: number;

  @ApiProperty({ 
    example: 'NovaSenha@2025', 
    minLength: 8, 
    description: 'Nova senha (mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 símbolo)' 
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;:',.<>/?~])[A-Za-z\d!@#$%^&*()_+\-=[\]{}|;:',.<>/?~]+$/, {
    message: 'A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um símbolo',
  })
  novaSenha: string;
}
