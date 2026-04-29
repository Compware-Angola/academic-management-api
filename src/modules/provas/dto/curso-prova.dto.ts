import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CursoProvaDto {
  @ApiProperty({ description: 'ID do curso', example: 1 })
  @IsInt()
  @IsPositive()
  id: number;
}

