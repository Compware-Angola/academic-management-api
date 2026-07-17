import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

export class FindPostGraduationTeacherAttendanceStatisticsDto {
  @ApiPropertyOptional({
    description: 'Grau: 2 = Mestrado, 3 = Doutoramento',
    enum: [2, 3],
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([2, 3])
  degreeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  anoLectivo?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  semestre?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  curso?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  docente?: number = 0;

  @IsOptional()
  @IsString()
  dataInicial?: string;

  @IsOptional()
  @IsString()
  dataFinal?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  naoCobrarFaltas?: boolean = false;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  exigirPresencasConfirmadas?: boolean = false;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  exigirSumariosInseridos?: boolean = false;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  exigirSumariosValidos?: boolean = false;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
