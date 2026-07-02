import { IsInt, IsNotEmpty, IsOptional, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GenerateMesTempDTO {
  @ApiProperty({
    description: 'Data Inicial',
    example: 2027,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  anoInicial: number;

  @ApiProperty({
    description: 'Data Inicial',
    example: 2028,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  anoFinal: number;

  @ApiPropertyOptional({
    description: 'Tipo de candidatura',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  tipo_candidatura: number;
}
