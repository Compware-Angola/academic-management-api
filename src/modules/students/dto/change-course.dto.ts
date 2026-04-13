


import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsInt,
    IsOptional,
    IsNumber,
    IsPositive,
} from 'class-validator';

export class ChangeCourseDTO {
    @ApiProperty({
        description: 'Polo obrigatório',
        example: 21,
        minimum: 1,
        required: false,
    })
    @IsNumber()
    @IsPositive()
    @IsOptional()
    @Type(() => Number)
    PoloId?: number;

    @ApiPropertyOptional({
        description: 'Codigo da Matricula',
        example: 486,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    matriculaId?: number;

    @ApiPropertyOptional({
        description: 'Tipo de prova',
        example: 486,
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    cursoId?: number;
}

