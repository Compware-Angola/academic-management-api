import { IsArray, IsInt, IsNotEmpty, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class MoveStudentsToScheduleDto {
  @ApiProperty({
    description: 'Array com os IDs dos alunos que serão movidos',
    example: [1, 2, 3, 4],
  })
  @IsNotEmpty({ message: 'A lista de alunos não pode estar vazia' })
  @IsArray({ message: 'Os alunos devem ser um array' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'Cada ID de aluno deve ser um número inteiro' })
  @IsPositive({ each: true, message: 'Cada ID de aluno deve ser positivo' })
  studentsCurriculumIds: number[];

  @ApiProperty({
    description: 'ID do horário de origem (de onde os alunos serão removidos)',
    example: 5,
  })
  @IsNotEmpty({ message: 'O ID do horário de origem é obrigatório' })
  @IsInt({ message: 'O ID do horário de origem deve ser um número inteiro' })
  @IsPositive({ message: 'O ID do horário de origem deve ser positivo' })
  fromScheduleId: number;

  @ApiProperty({
    description: 'ID do horário de destino (para onde os alunos serão movidos)',
    example: 10,
  })
  @IsNotEmpty({ message: 'O ID do horário de destino é obrigatório' })
  @IsInt({ message: 'O ID do horário de destino deve ser um número inteiro' })
  @IsPositive({ message: 'O ID do horário de destino deve ser positivo' })
  toScheduleId: number;
}