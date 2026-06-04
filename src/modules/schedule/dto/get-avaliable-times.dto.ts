import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsNumber, IsOptional } from "class-validator";




export class GetAvailableTimesDto {
    @ApiProperty({
        description: "Ano lectivo",
        example: 23,
        required: true,
    })
    @Type(() => Number)
    @IsNumber()
    @IsInt()
    anoLectivo: number;
    @ApiProperty({
        description: "Periodo",
        example: 1,
        required: true,
    })
    @Type(() => Number)
    @IsNumber()
    @IsInt()
    periodo: number;
    @ApiProperty({
        description: "Dia da semana",
        example: 1,
        required: false,
    })
    @Type(() => Number)
    @IsNumber()
    @IsInt()
    @IsOptional()
    diaSemana?: number;
}