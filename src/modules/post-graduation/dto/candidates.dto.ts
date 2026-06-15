import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { CandidateStatus, PaymentStatus, SortBy, SortOrder } from '../enums';

export class FindCandidatesDto {
  @ApiPropertyOptional({ description: 'Tipo de candidatura', example: 2 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoTipoCandidatura?: number;

  @ApiPropertyOptional({ description: 'Ano lectivo', example: 22 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoAnoLectivo?: number;

  @ApiPropertyOptional({ description: 'Curso', example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  codigoCurso?: number;

  @ApiPropertyOptional({
    description: 'Estado do candidato',
    enum: CandidateStatus,
    example: CandidateStatus.ADMITIDO,
  })
  @IsOptional()
  @IsEnum(CandidateStatus)
  estado?: CandidateStatus;

  @ApiPropertyOptional({
    description: 'Estado do pagamento',
    enum: PaymentStatus,
    example: PaymentStatus.TODOS,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  pagamento?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Pesquisa por nome', example: 'João' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Ordenar por',
    enum: SortBy,
    example: SortBy.DATA,
  })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;

  @ApiPropertyOptional({
    description: 'Direcção da ordenação',
    enum: SortOrder,
    example: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;

  @ApiPropertyOptional({ description: 'Página', example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Limite', example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
