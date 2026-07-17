import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsPositive } from "class-validator";

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
    @IsPositive()
    @IsNotEmpty()
    @ApiProperty({
        type: Number,
        description: 'Código da classe',
        example: 1,
    })
    @Type(() => Number)
    codigoClasse: number;
}
