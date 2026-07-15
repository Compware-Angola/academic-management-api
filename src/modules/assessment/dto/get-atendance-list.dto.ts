import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class GetPresenceAttendanceDto {
  @Type(() => Number)
  @IsInt()
  anoLectivo: number;

  @Type(() => Number)
  @IsInt()
  semestre: number;

  @Type(() => Number)
  @IsInt()
  periodoId: number;

  @Type(() => Number)
  @IsInt()
  horarioPk: number;

  @Type(() => Number)
  @IsInt()
  codigoDisciplina: number;

  @Type(() => Number)
  @IsInt()
  situacao_financeira: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  codigoMatricula?: number;

  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}
