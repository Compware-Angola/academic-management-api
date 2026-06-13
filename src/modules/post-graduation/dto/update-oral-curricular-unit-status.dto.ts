import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateOralCurricularUnitStatusDto {
  @ApiProperty({
    example: true,
    description: 'Indica se a UC exige avaliacao oral',
  })
  @IsBoolean()
  enabled: boolean;
}
