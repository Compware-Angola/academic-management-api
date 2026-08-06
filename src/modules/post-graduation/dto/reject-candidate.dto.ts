// src/candidates/dto/reject-candidate.dto.ts
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class RejectCandidateDto {
  @IsNumber()
  anoLectivo: number;

  @IsNumber()
  preInscricao: number;

  @IsNumber()
  utilizador: number;

  @IsString()
  motivo: string;

  @IsNumber()
  @IsOptional()
  estadoRejeicao?: number;
}
