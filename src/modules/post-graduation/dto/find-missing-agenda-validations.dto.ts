import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { FindAgendaValidationOptionsDto } from './find-agenda-validation-options.dto';

export class FindMissingAgendaValidationsDto extends FindAgendaValidationOptionsDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  curricularYearId?: number;

  @ApiPropertyOptional({ example: 1107 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  curricularGradeId?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
