
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
} from 'class-validator';
export class FindGradeCurricularDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  classe?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  curso?: number;

  @ApiPropertyOptional({ example: 23 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  anoLectivo?: number;

  @ApiPropertyOptional({ example: 'Matemática', description: 'Pesquisar por nome da disciplina' })
  @IsOptional()
  @IsString()
  search?: string;
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 25, default: 25, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 25;
}