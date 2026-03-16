import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';

export class CreateAvisoUmaDto {

  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional({
      description: 'Assunto',
      example: "Todos os estudantes devem pagar as propinas, caso contrário não farão prova",
    })
  assunto: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Data de expiração do aviso'
  })
  date_expiracao?: Date;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Utilizador que criou o aviso',
    example: 146,
  })
  userId?: number;

  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional({
    description: 'Descrição do aviso',
    example: "É importante que levem a sério este aviso",
  })
  descricao: string;

  @IsString()
  @IsOptional()
  sigla?: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsNumber()
  @IsOptional()
  destino?: number;

  @IsNumber()
  @IsOptional()
  curso?: number;

  @IsNumber()
  @IsOptional()
  periodo?: number;

  @IsNumber()
  @IsOptional()
  canal?: number;

  @IsNumber()
  @IsOptional()
  status?: number;

  @IsNumber()
  @IsOptional()
  origem?: number;
}