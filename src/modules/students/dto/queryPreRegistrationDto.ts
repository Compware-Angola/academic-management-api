
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Min,
  IsNumber,
  IsPositive,
  IsIn,
  Max,
  IsString,
  IsNotEmpty,
  IsDateString,
  IsEnum,
} from 'class-validator';

export class QueryPreRegistrationDto {

  @ApiProperty({
    description: 'Ano letivo obrigatório',
    example: 21,
    minimum: 1,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  anoLectivo?: number;

  @ApiPropertyOptional({
    description: 'Curso Candidatura',
    example: 486,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  cursoCandidatura?: number;

  @ApiPropertyOptional({
    description: 'Estado da pré inscrição',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  estado?: number;

  @ApiPropertyOptional({
    description: 'Campo de pesquisa para nome da unidade curricular',
    example: "Matemática",

    required: false,
  })
  @IsOptional()
  @IsString()
  @Type(() => String)
  search?: string;
  @ApiPropertyOptional({
    description: 'Número da página',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página (máximo 100)',
    example: 25,
    minimum: 1,
    maximum: 100,
    default: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 25;
}


