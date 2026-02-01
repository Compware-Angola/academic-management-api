import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsString,
} from 'class-validator';

export class EnrollmentDto {
  @ApiProperty({
    description: 'Código único da pré-inscrição do aluno',
    example: 'PRE-2025-000145',
  })
  @IsString()
  codPreInscricao: string;

  @ApiProperty({
    description: 'Lista de códigos das grades curriculares',
    example: ['GRD-101', 'GRD-102', 'GRD-201'],
    isArray: true,
    type: String,
    minItems: 1,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  grades: string[];
}
