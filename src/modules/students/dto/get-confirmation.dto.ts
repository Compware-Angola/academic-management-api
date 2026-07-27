import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, Max, Min, ValidateIf } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GetConfirmationDTO {
    @IsBoolean()
    @IsNotEmpty()
    @ApiProperty({
        type: Boolean,
        description: 'Indica se é aluno novo (sem matrícula, usa pré-inscrição) ou aluno antigo (usa matrícula)',
        example: false,
        default: false,
    })
    @Transform(({ value }) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') return value.toLowerCase() === 'true';
        return value;
    })
    alunoNovo: boolean;
    @ApiProperty({
        example: 2024,
        description: 'Código do ano lectivo',
    })
    @IsInt()
    @Min(1)
    @Type(() => Number)
    @IsOptional()
    codigoAnoLectivo: number;
    @ValidateIf((o) => !o.alunoNovo)
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