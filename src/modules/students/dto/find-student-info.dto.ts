import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class FindStudentClassInfoDTO {
  @ApiProperty({
    description: 'Número de matrícula do estudante',
    example: 40014,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  numeroDeMatricula: number;

  @ApiPropertyOptional({
    description: 'Código do ano lectivo',
    example: 17,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  anoLectivo?: number;
}