import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt } from 'class-validator';

export class UpdateAgendaValidationStatusDto {
  @ApiProperty({
    example: 2,
    description: 'Novo estado: 2 = Aprovado, 3 = Rejeitado',
    enum: [2, 3],
  })
  @Type(() => Number)
  @IsInt()
  @IsIn([2, 3])
  statusId: number;
}
