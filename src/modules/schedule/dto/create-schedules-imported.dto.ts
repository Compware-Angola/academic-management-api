import { ApiProperty } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsNumber,
    ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ScheduleImportedDto {
    @ApiProperty({
        example: 1,
    })
    @IsNumber()
    @Type(() => Number)
    scheduleId: number;
}

export class CreateImportSchedulesDto {
    @ApiProperty({
        type: () => [ScheduleImportedDto],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ScheduleImportedDto)
    schedulesImported: ScheduleImportedDto[];

    @ApiProperty({
        example: false,
        default: false,
    })
    @Transform(({ value }) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') return value === 'true';
        return value;
    })
    @IsBoolean()
    permitiColisao: boolean;

    @ApiProperty({
        example: 2024,
    })
    @Type(() => Number)
    @IsNumber()
    fkanoLectivoDestino: number;
}