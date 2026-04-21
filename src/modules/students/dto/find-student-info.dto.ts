import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class FindStudentClassInfoDTO {
  @ApiProperty({
    description: 'Número de matrícula do estudante',
    example: 40014,
  })
  @IsNotEmpty()
    @Type(() => Number)
  @IsNumber()
  numeroDeMatricula: number;

  @ApiProperty({
    description: 'Código do ano lectivo',
    example: 17,
  })
  @IsNotEmpty()
    @Type(() => Number)
  @IsNumber()
  anoLectivo: number;
}