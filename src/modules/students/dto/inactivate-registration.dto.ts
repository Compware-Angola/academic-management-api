import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class InactivateRegistrationDTO {
  @ApiProperty({
    description: 'Código da matrícula do estudante',
    example: 40014,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  codigoMatricula: number;

  @ApiPropertyOptional({
    description: 'Motivo informado para a inativação da matrícula',
    example: 'Inativação solicitada pela secretaria académica',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivo?: string;
}
