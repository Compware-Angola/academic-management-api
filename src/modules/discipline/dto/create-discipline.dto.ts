import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateDisciplinaDto {

  @ApiProperty({
    description: 'Designação da disciplina',
    example: 'Matemática Aplicada'
  })
  @IsString()
  @IsNotEmpty()
  designacao: string;

  @ApiProperty({
    description: 'Tipo da unidade curricular',
    example: 'S'
  })
  @IsString()
  @IsNotEmpty()
  tipoUnidadeCurricular: string;

  @ApiProperty({
    description: 'Natureza da unidade curricular',
    example: 'TP'
  })
  @IsString()
  @IsNotEmpty()
  naturezaUnidadeCurricular: string;

  @ApiPropertyOptional({
    description: 'Código identificador da disciplina',
    example: 'MAT-101'
  })
  @IsOptional()
  @IsString()
  codigoDisciplina?: string;

  @ApiPropertyOptional({
    description: 'Abreviatura da disciplina',
    example: 'MAT'
  })
  @IsOptional()
  @IsString()
  nomeAbreviatura?: string;
}