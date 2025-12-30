import { IsOptional, IsInt, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class FilterLogsAcessoDto {
  @ApiProperty({ 
    example: 1548, 
    description: 'ID do utilizador responsável. Use 404 ou omita para trazer todos',
    required: false 
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : Number(value)))
  @IsInt()
  @Min(1)
  utilizadorId?: number;

  @ApiProperty({ example: '2023-01-01', description: 'Data início (YYYY-MM-DD)' })
  @IsDateString()
  dataInicio: string;

  @ApiProperty({ example: '2023-12-22', description: 'Data fim (YYYY-MM-DD)' })
  @IsDateString()
  dataFim: string;
}