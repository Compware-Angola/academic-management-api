import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHorarioProvaDto {
  @ApiProperty({
    description: 'ID da prova',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  provaId: number;

  @ApiProperty({
    description: 'Data de realização (formato: YYYY-MM-DD)',
    example: '2026-05-15',
  })
  @IsNotEmpty()
  @IsString()
  dataRealizacao: string;

  @ApiProperty({
    description: 'Hora de início (formato: HH:MM)',
    example: '09:00',
  })
  @IsNotEmpty()
  @IsString()
  horaInicio: string;

  @ApiProperty({
    description: 'Hora de fim (formato: HH:MM)',
    example: '11:00',
  })
  @IsNotEmpty()
  @IsString()
  horaFim: string;

  @ApiProperty({
    description: 'ID da sala',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  salaId: number;

  @ApiProperty({
    description: 'ID do polo',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  poloId: number;

  @ApiProperty({
    description: 'ID do usuário',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({
    description: 'ID do curso',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  cursoId: number;

  @ApiProperty({
    description: 'ID do período',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  periodoId: number;

  @ApiProperty({
    description: 'ID do ano letivo',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  anoLetivoId: number;
}
