// dto/curso-params.dto.ts
import { IsOptional, IsNumberString } from 'class-validator';

export class CursoParamsDto {
  @IsOptional()
  @IsNumberString()
  faculdadeId?: string;

  @IsOptional()
  @IsNumberString()
  tipoCandidaturaId?: string;

  @IsOptional()
  @IsNumberString()
  anoLectivo?: string;

  @IsOptional()
  @IsNumberString()
  periodo?: string;
}

// interfaces/curso.interface.ts
export interface Curso {
  codigo: number;
  designacao: string;
  duracao: number;
}
