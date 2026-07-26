import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional, IsPositive } from "class-validator";

export class FindPlanPorClasseDTO {
    @IsNumber()
    @IsPositive()
    @IsNotEmpty()
    @ApiProperty({
        type: Number,
        description: 'Código da matrícula',
        example: 1,
    })
    @Type(() => Number)
    codigoMatricula: number;
    @IsNumber()
    @ApiProperty({
        type: Number,
        description: 'Código do ano lectivo',
        example: 2024,
    })
    @Type(() => Number)
    codigoAnoLectivo: number;
}
