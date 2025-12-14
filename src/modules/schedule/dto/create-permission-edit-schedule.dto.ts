// src/horarios/dto/create-permission-edit-schedule.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsPositive, IsDateString } from 'class-validator';

export class CreatePermissionEditScheduleDto {
  @ApiProperty({
    description: 'ID do horário a ser editado',
    example: 2681,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  fkHorario: number;

  @ApiProperty({
    description: 'ID do horário a ser editado',
    example: 2681,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  userId: number;

  @ApiProperty({
    description: 'Data de início da permissão',
    example: '2023-05-06',
  })
  @IsDateString()
  dataInicio: string;

  @ApiProperty({
    description: 'Data de fim da permissão',
    example: '2023-05-06',
  })
  @IsDateString()
  dataFim: string;
}
