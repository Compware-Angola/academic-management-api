import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GenerateMesTempDTO {
  @ApiProperty({
    description: 'ID do ano letivo',
    example: 22,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  anoLectivoId: number;
}
