import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateDisciplinaDto {
  @ApiPropertyOptional({ example: 'Matemática Aplicada' })
  @IsOptional()
  @IsString()
  designacao?: string;

 

  @ApiPropertyOptional({ example: 'S' })
  @IsOptional()
  @IsString()
  tipoUnidadeCurricular?: string;

  @ApiPropertyOptional({ example: 'TP' })
  @IsOptional()
  @IsString()
  naturezaUnidadeCurricular?: string;

  @ApiPropertyOptional({ example: 'MAT-101' })
  @IsOptional()
  @IsString()
  codigoDisciplina?: string;

  @ApiPropertyOptional({ example: 'MAT' })
  @IsOptional()
  @IsString()
  nomeAbreviatura?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  duracao?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  status?: number;
}