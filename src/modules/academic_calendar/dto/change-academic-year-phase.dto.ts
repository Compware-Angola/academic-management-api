import { IsEnum, IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EstadoAnoLectivoType } from 'src/common/enums/faso_anolectivo.type';

export class ChangeAcademicYearPhaseDto {
  @ApiProperty({
    description: 'Nova fase do ano lectivo',
    enum: EstadoAnoLectivoType,
    example: EstadoAnoLectivoType.USAVEL,
  })
  @IsEnum(EstadoAnoLectivoType)
  faseLectiva: EstadoAnoLectivoType;
}
