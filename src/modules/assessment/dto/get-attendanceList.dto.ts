import { IsInt, Min, IsIn, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class getAttendanceListDto {
  @ApiProperty({
    description:
      'Ano letivo no formato de dois dígitos (ex: 25 para 2025/2026)',
    example: 21,
    minimum: 0,
    type: Number,
  })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  anoLectivo: number;

  @ApiProperty({
    description: 'Código do horário associado à turma/disciplina',
    example: 20505,
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  horarioPk?: number;

  // @ApiProperty({
  //     description: 'Tipo  de prova',
  //     example: 2,
  //     type: Number,
  // })
  // @IsInt()
  // @IsOptional()
  // @IsIn([1, 2])
  // @Type(() => Number)
  // situacao_financeira: number;
  // @ApiProperty({
  //     description: 'Tipo de avaliação',
  //     example: 2,
  //     type: Number,
  // })
  // @IsInt()
  // @IsOptional()
  // @IsIn([1, 2])
  // @Type(() => Number)
  // tipo_avaliacao: number;
}
