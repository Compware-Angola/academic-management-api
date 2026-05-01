import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber } from "class-validator";

export class FindProvasRecursoDto {
    @ApiProperty({ description: 'Ano letivo', example: 2026 })
    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    anoLectivo: number;

    @ApiProperty({ description: 'Código da matrícula', example: 12345 })
    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    codigoMatricula: number;
}