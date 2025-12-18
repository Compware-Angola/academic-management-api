import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class HistoryNoteReleaseDto {
    @ApiProperty({
        description: 'Código do ano letivo',
        example: 22,
        type: Number,
        minimum: 1,
    })
    @IsNumber({}, { message: 'codigoAnoLectivo deve ser um número' })
    @IsNotEmpty({ message: 'codigoAnoLectivo é obrigatório' })
    @IsInt({ message: 'codigoAnoLectivo deve ser um número inteiro' })
    @IsPositive({ message: 'codigoAnoLectivo deve ser positivo' })
    @Optional()
    @Transform(({ value }) => Number(value))
    codigoAnoLectivo?: number;

    @ApiProperty({
        description: 'Código da matrícula do aluno',
        example: 54312,
        type: Number,
        minimum: 1,
    })
    @IsNumber({}, { message: 'codigoMatricula deve ser um número' })
    @IsNotEmpty({ message: 'codigoMatricula é obrigatório' })
    @IsInt({ message: 'codigoMatricula deve ser um número inteiro' })
    @IsPositive({ message: 'codigoMatricula deve ser positivo' })
    @Transform(({ value }) => Number(value))
    @Optional()
    codigoMatricula?: number;

    @ApiProperty({
        description: 'Código da grade curricular do aluno',
        example: 1336896,
        type: Number,
        minimum: 1,
    })
    @IsNumber({}, { message: 'codigoMatricula deve ser um número' })
    @IsNotEmpty()
    @IsInt()
    @Transform(({ value }) => Number(value))
    @Optional()
    codigo_grade_curricular_aluno?: number;
}