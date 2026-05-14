import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max, IsOptional } from 'class-validator';

export class LancarNotaManualDto {
  @ApiProperty({
    description: 'Nota do candidato (pode ser null para reprovar)',
    example: 12.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  nota: number | null;
}
