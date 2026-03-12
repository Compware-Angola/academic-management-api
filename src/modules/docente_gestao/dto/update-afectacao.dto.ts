import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsNumber, IsPositive, IsIn } from 'class-validator';

export class UpdateAfectacaoDTO {
  @ApiProperty({
    description: 'Status da Afectação',
    example: 1,
    enum: [0, 1],
  })
  @IsInt()
  @IsOptional()
  @IsIn([0, 1], { message: 'Os status devem estar no limite de 0 á 1' })
  @Type(() => Number)
  status: number;
}
