import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class IChangeShiftParams {
    @ApiProperty({
        example: 48030,
        description: 'Código da matrícula do estudante',
    })
    @IsNumber()
    @IsNotEmpty()
    codigoMatricula: number;

    @ApiProperty({
        example: 6,
        description: 'Código do novo período/turno',
    })
    @IsNumber()
    @IsNotEmpty()
    novoPeriodoCodigo: number;

    @ApiProperty({
        example: 23,
        description: 'Identificador do ano lectivo',
    })
    @IsNumber()
    @IsNotEmpty()
    anoLectivoId: number;
}