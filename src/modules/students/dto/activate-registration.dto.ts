import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class ActivateRegistrationDTO {
  
  @ApiProperty({
    description: 'Código da matrícula do estudante',
    example: 12345,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  codigoMatricula: number;

  @ApiProperty({
    description: 'ID do ano letivo',
    example: 2025,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  anoLectivoId: number;
}