import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsNumber } from "class-validator";
import { Transform, Type } from "class-transformer";

export class ImportSchedulesDto {

    @ApiProperty({
        type: Number,
        description: 'Código do ano lectivo de origem',
        example: 2024,
    })
    @IsNotEmpty()
    @Type(() => Number)
    @IsNumber()
    fkanoLectivoOrigem: number;
    @ApiProperty({
        type: Number,
        description: 'Código do ano lectivo de destino',
        example: 2024,
    })
    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    fkanoLectivoDestino: number;
    @ApiProperty({
        type: Number,
        description: 'Código do curso',
        example: 1,
    })
    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    fkCurso: number;
    @ApiProperty({
        type: Number,
        description: 'Código da classe',
        example: 1,
    })
    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    fkClasse: number;
    @ApiProperty({
        type: Number,
        description: 'Código do semestre',
        example: 1,
    })
    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    fksemestre: number;
    @ApiProperty({
        type: Number,
        description: 'Código do periodo',
        example: 1,
    })
    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    fkperiodo: number;


}
