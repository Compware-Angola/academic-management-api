import { IsOptional, IsInt, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class FilterLogsAcessoDto {
  @ApiProperty({
    example: 1548,
    description: 'ID do utilizador responsável. Use 404 ou omita para trazer todos',
    required: false
  })
  @IsOptional()
 
  @IsInt()
  @Min(1)
    @Type(() => Number)

  utilizadorId?: number;

  @ApiProperty({ example: '2023-01-01', description: 'Data início (YYYY-MM-DD)' })
  @IsDateString()
  dataInicio: string;

  @ApiProperty({ example: '2023-12-22', description: 'Data fim (YYYY-MM-DD)' })
  @IsDateString()
  dataFim: string;
  @ApiPropertyOptional({
    description: 'Número da página',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página (máximo 100)',
    example: 25,
    minimum: 1,
    maximum: 100,
    default: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 25;

  @ApiPropertyOptional({
    description: 'Termo de busca no nome ou email',
    example: 'joao'
  })
  @IsOptional()
  search?: string;
}