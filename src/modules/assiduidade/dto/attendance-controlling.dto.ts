import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AtendanceControlling {


  @ApiProperty({
    description: 'ID do Docente',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  docente?: number;

  @ApiProperty({
    description: 'Data inicial do intervalo',
    example: '2025-01-02',
    type: String,
    format: 'date',
  })
  @IsNotEmpty()
  @Type(() => Date)
  dataInicial: Date;

  @ApiProperty({
    description: 'Data final do intervalo',
    example: '2025-05-02',
    type: String,
    format: 'date',
  })
  @IsNotEmpty()
  @Type(() => Date)
  dataFinal: Date;

  @ApiProperty({
    description: 'Estado da aula',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  estado?: number;

  @ApiProperty({
    description: 'Ano Lectivo',
    example: 22,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  anoLectivo?: number;

  @ApiProperty({
    description: 'Semestre',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  semestre?: number;

  @ApiProperty({
  description: 'Grade Curricular',
  example: 10,
  required: false,
})
@IsOptional()
@IsInt()
@Type(() => Number)
gradeCurricular?: number;

  @ApiProperty({
    description: 'Número da página (começa em 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: 'Quantidade de registos por página',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}