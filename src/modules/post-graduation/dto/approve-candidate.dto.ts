// src/candidates/dto/approve-candidate.dto.ts
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class ApproveCandidateDto {
  @IsNumber()
  preInscricao: number;

  @IsNumber()
  anoLectivo: number;

  @IsNumber()
  @IsOptional()
  mediaFinal?: number;

  @IsNumber()
  @IsOptional()
  canal?: number;

  @IsNumber()
  @IsOptional()
  poloId?: number;

  @IsString()
  @IsOptional()
  resultado?: string;

  @IsNumber()
  approvedBy: number;
}
