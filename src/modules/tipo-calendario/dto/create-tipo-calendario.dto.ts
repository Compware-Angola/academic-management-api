import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTipoCalendarioDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  designacao?: string;

  @IsOptional()
  @IsInt()
  ativoParaAluno?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sigla?: string;
}
