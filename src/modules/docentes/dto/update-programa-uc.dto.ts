import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateProgramaStatusUCDTO {
  @ApiProperty({
    description: 'Código de Estado ser actualizado',
    example: 486,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  estado: number;
}
