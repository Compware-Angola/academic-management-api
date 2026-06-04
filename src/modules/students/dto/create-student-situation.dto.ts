import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsPositive } from "class-validator";

export class CreateStudentSituationDto {
    @ApiProperty({
        type: 'number',
        description: 'Código da matrícula',
        example: 4444,
    })
    @IsNotEmpty()
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    enrollmentCode: number;

    @ApiProperty({
        type: 'number',
        description: 'Código do motivo de situação',
        example: 3,
    })
    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    reasonSituationCode: number;

    @ApiProperty({
        type: 'number',
        description: 'Código do ano letivo',
        example: 23,
    })
    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    academicYearCode: number;
}