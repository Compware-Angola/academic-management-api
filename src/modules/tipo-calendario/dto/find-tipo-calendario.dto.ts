import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FindTipoCalendarioQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  // filtra por ATIVO_PARA_ALUNO (0 ou 1)
  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1])
  ativoParaAluno?: number;
}
