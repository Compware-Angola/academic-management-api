import { IsNotEmpty, IsString, IsArray, ValidateNested, ArrayMinSize, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GradeItemDto {
  @ApiProperty({
    example: 173,
    description: 'Código único da grade curricular (ex: código da UC + ano + semestre)',
  })
  @IsNotEmpty({ message: 'codigoGrade é obrigatório' })
  @IsNumber({}, { message: 'codigoGrade deve ser um número' })
  codigoGrade: number;

  @ApiProperty({
    example: 24870,
    description: 'Código do horário associado à grade curricular',
  })
  @IsNotEmpty({ message: 'codigoHorario é obrigatório' })
  @IsNumber({}, { message: 'codigoHorario deve ser um número' })
  codigoHorario: number;

  @ApiProperty({
    example: 'CARDIO.1.ICARD.D-H1',
    description: 'Descrição legível do horário (ex: dias da semana e turno)',
  })
  @IsNotEmpty({ message: 'descHorario é obrigatório' })
  @IsString({ message: 'descHorario deve ser uma string' })
  descHorario: string;
}

// DTO principal para o endpoint
export class EnrollmentRegistrationsUCDto {
  @ApiProperty({
    example: 114525,
    description: 'Código da pré-inscrição do aluno (gerado no processo de candidatura/admissão)',
  })
  @IsNotEmpty({ message: 'codPreInscricao é obrigatório' })
  @IsNumber({}, { message: 'codPreInscricao deve ser um número' })
  codPreInscricao: number;

  @ApiProperty({
    type: [GradeItemDto],  // <-- importante para array de objetos nested
    description: 'Lista de grades curriculares (unidades curriculares + horários) a serem confirmadas/inscritas',
    minItems: 1,
  })
  @IsArray({ message: 'grades deve ser um array' })
  @ArrayMinSize(1, { message: 'É necessário enviar pelo menos uma grade curricular' })
  @ValidateNested({ each: true })
  @Type(() => GradeItemDto)
  grades: GradeItemDto[];
}