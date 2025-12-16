import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FindScheduleByDesignationDto {
  @ApiProperty({
    description: 'Designação do horário / unidade curricular',
    example: 'ACSP.2.HEMAT I-H1',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  designation: string;

  @ApiProperty({
    description: 'Período académico',
    example: 1,
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  periodo: number;

  @ApiProperty({
    description: 'Ano lectivo',
    example: 2024,
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ano_lectivo: number;
}
