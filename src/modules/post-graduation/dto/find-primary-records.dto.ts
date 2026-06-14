import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class FindPrimaryRecordsDto {
  @ApiProperty({
    example: 23,
    description: 'Codigo do ano lectivo da confirmacao',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  academicYearId: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Tipo de candidatura: 2 = Mestrado, 3 = Doutoramento',
    enum: [2, 3],
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([2, 3])
  applicationTypeId?: number;

  @ApiPropertyOptional({
    example: 'Maria',
    description: 'Pesquisa por nome, bilhete, matricula ou curso',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
