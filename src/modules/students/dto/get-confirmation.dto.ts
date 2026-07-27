import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, Max, Min, ValidateIf } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GetConfirmationDTO {

    @ApiProperty({
        example: 2024,
        description: 'Código do ano lectivo',
    })
    @IsInt()
    @Min(1)
    @Type(() => Number)
    @IsOptional()
    codigoAnoLectivo: number;

    @IsNumber()
    @IsPositive()
    @IsNotEmpty()
    @ApiProperty({
        type: Number,
        description: 'Código do semestre (obrigatório quando alunoNovo = false)',
        example: 1,
        required: false,
    })
    @Type(() => Number)
    codigoSemestre?: number;
}