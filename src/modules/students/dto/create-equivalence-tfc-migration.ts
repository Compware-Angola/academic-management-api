import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsNumber,
  IsPositive,
  IsString,
  ValidateNested,
  IsIn,
} from 'class-validator';

class EquivalenceTFCMigrationItemDto {
  @ApiProperty({
    description: 'Ano lectivo',
    example: '2025',
  })
  @IsNumber()
  @Type(() => Number)
  anoLectivo: number;

  @ApiProperty({
    description: 'Nota',
    example: 15,
  })
  @IsNumber()
  @Type(() => Number)
  nota: number;

  @ApiPropertyOptional({
    description: 'Código de Semestre',
    example: 1,
    enum: [1, 2],
    required: false,
  })
  @IsOptional()
  @IsIn([1, 2], { message: 'semestre deve ser 1 ou 2' })
  @IsInt()
  @Type(() => Number)
  semestreId?: number;

  @ApiProperty({
    description: 'Código da grade',
    example: 120,
  })
  @IsInt()
  @Type(() => Number)
  codigoGrade: number;

  @ApiProperty({
    description: 'Código da grade do aluno',
    example: 350,
  })
  @IsInt()
  @Type(() => Number)
  codigoGradeAluno: number;
}

export class CreateEquivalenceTFCMigration {
  @ApiPropertyOptional({
    description: 'Código da matrícula',
    example: 486,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  matriculaId?: number;

  @ApiPropertyOptional({
    description: 'Equivalência',
    example: 1,
    enum: [1, 2],
    required: false,
  })
  @IsOptional()
  @IsIn([0, 1], { message: 'Equivalencia deve ser 1 ou 2' })
  @IsInt()
  @Type(() => Number)
  equivalencia?: number;

  @ApiProperty({
    description: 'Lista de disciplinas/equivalências',
    type: [EquivalenceTFCMigrationItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EquivalenceTFCMigrationItemDto)
  itens: EquivalenceTFCMigrationItemDto[];
}
