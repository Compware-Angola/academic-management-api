import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
    IsBoolean,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    ValidateIf,
} from "class-validator";

export class FindPlanPorClasseDTO {
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

    @ValidateIf((o) => !o.alunoNovo)
    @IsNumber()
    @IsPositive()
    @IsNotEmpty()
    @ApiProperty({
        type: Number,
        description: 'Código da matrícula (obrigatório quando alunoNovo = false)',
        example: 1,
        required: false,
    })
    @Type(() => Number)
    codigoMatricula?: number;

    @ValidateIf((o) => o.alunoNovo)
    @IsNumber()
    @IsPositive()
    @IsNotEmpty()
    @ApiProperty({
        type: Number,
        description: 'Código da pré-inscrição (obrigatório quando alunoNovo = true)',
        example: 1,
        required: false,
    })
    @Type(() => Number)
    codigoPreInscricao?: number;

    @IsNumber()
    @IsNotEmpty()
    @ApiProperty({
        type: Number,
        description: 'Código do ano lectivo',
        example: 2024,
    })
    @Type(() => Number)
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