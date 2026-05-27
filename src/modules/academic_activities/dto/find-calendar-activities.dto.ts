import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class FindCalendarActivitiesDto {
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
    example: 1,
  })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  @Type(() => Number)
  tpcandidatura: number;
}
