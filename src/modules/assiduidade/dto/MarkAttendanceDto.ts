import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class MarkAttendanceDto {

  @ApiProperty({
    description: 'Código do Agendamento',
    example: 15,
  })
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  codigoAgendamento: number;

  @ApiProperty({
    description: 'Novo estado do agendamento',
    example: 3,
    enum: [1, 2, 3],
  })
  @IsNotEmpty()
  @IsInt()
  @IsIn([1, 2, 3])
  @Type(() => Number)
  novoEstado: number;
}