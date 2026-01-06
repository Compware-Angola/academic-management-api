import { IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCargoDto {
  @ApiProperty({ description: 'ID do tipo de cargo' })
  @IsInt()
  tipoCargoId: number;

  @ApiProperty({ description: 'ID do utilizador que vai ocupar o cargo' })
  @IsInt()
  utilizadorId: number;

  @ApiPropertyOptional({ description: 'ID da faculdade (obrigatório para Decano)' })
  @IsOptional()
  @IsInt()
  faculdadeId?: number;

  @ApiPropertyOptional({ description: 'ID do curso (obrigatório para Director/Coordenador)' })
  @IsOptional()
  @IsInt()
  cursoId?: number;
}