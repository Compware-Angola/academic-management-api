import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
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
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  anoFinal: number;
}
