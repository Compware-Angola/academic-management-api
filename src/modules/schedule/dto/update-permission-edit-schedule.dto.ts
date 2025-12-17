import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsIn,
  IsInt,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'stream';

export class UpdatePermissionEditScheduleDto {
  @ApiPropertyOptional({
    description: 'Data de início da permissão',
    example: '2023-05-06',
  })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim da permissão',
    example: '2023-05-10',
  })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiPropertyOptional({
    description: 'Estado ativo da permissão (1 = ativo, 0 = inativo)',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number) // <-- transforma a string em número
  @IsInt({ message: 'ativeState deve ser um número inteiro' })
  @Min(0, { message: 'ativeState deve ser 0 ou 1' })
  @Max(1, { message: 'ativeState deve ser 0 ou 1' })
  ativeState?: number;
}
