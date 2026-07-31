import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsNumber } from "class-validator";
import { Transform, Type } from "class-transformer";

export class ScheduleImportedDto {
    @ApiProperty({
        type: Number,
        description: 'Horários a serem importados',
        example: 1,
    })
    @IsNotEmpty()
    @Type(() => Number)
    @IsNumber()
    scheduleId: number;

}

export class CreateImportSchedulesDto {
    @ApiProperty({
        type: [ScheduleImportedDto],
        isArray: true,
    })
    @IsNotEmpty()
    @Type(() => ScheduleImportedDto)
    schedulesImported: ScheduleImportedDto[];
    @IsBoolean()
    @IsNotEmpty()
    @ApiProperty({
        type: Boolean,
        description: 'Indica se permite a colisão de aulas ou não',
        example: false,
        default: false,
    })
    @Transform(({ value }) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') return value.toLowerCase() === 'true';
        return value;
    })
    permitiColisao: boolean

    @ApiProperty({
        type: Number,
        description: 'Código do ano lectivo de destino',
        example: 2024,
    })
    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    fkanoLectivoDestino: number;


}
