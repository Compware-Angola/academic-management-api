// filter-docente.dto.ts
import { IsOptional, IsInt, IsString, IsNotEmpty } from 'class-validator';

export class FilterDocenteDto {
  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  limit?: number;

  @IsOptional()
  @IsInt()
  area?: number; // 0 ou ausente = todas as áreas

  @IsOptional()
  @IsString()
  search?: string; // opcional, se quiser implementar busca por nome, email, etc.
}
