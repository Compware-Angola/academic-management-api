import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional } from 'class-validator';

export class GerarDiplomaDTO {
  @ApiProperty({
    example: 40014,
    description: 'Código da matrícula do estudante',
  })
  @Transform(({ value }) => Number(value))
  @IsInt()
  codigoMatricula: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Indica se é segunda via do diploma',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  segundaViaDiploma?: boolean;

  @ApiPropertyOptional({
    example: '2026-04-21',
    description: 'Data de conclusão do curso',
  })
  @IsOptional()
  @IsDateString()
  dataConclusao?: string;
}