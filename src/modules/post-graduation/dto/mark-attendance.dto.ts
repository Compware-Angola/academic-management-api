import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty } from 'class-validator';

export class MarkPostGraduationAttendanceDto {
  @ApiProperty({ description: 'Codigo do agendamento', example: 15 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  codigoAgendamento: number;

  @ApiProperty({
    description: 'Novo estado do agendamento',
    example: 3,
    enum: [1, 2, 3],
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2, 3])
  novoEstado: number;
}
