import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class FindAcademicActivityTermsDto {
  @ApiProperty({
    description: 'Código do ano lectivo',
    example: 23,
  })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  @Type(() => Number)
  anolectivo: number;

  @ApiProperty({
    description: 'Código do tipo de candidatura',
    example: '1',
  })
  @IsString()
  @IsNotEmpty()
  tpcandidatura: string;

  @ApiProperty({
    description: 'Código do tipo de prazo',
    example: 4,
  })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  @Type(() => Number)
  tpprazo: number;
}
