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
  assunto: string;

  @IsDateString()
  @IsOptional()
  date_expiracao?: Date;

  @IsNumber()
  @IsOptional()
  userId?: number;

  @IsString()
  @IsNotEmpty()
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