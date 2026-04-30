import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DisciplinaProvaDto {
  @ApiProperty({ description: 'ID da disciplina', example: 1 })
  @IsInt()
  @IsPositive()
  id: number;
}

