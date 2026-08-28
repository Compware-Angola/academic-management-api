import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty } from 'class-validator';

export class FindPlanoCurricularGradeDto {
  @ApiProperty({ description: 'Código do ano lectivo', example: 244 })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  codigoAnoLectivo: number;

  @ApiProperty({ description: 'Código da grade curricular', example: 3026 })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  codigoGradeCurricular: number;
}
