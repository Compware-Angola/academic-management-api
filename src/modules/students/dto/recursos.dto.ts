import { ApiProperty, OmitType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsNumber } from "class-validator";

export class FindCadeirasRecursoDto {
    @ApiProperty({ description: 'Ano letivo', example: 22 })
    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    anoLectivo: number;

    @ApiProperty({ description: 'Código da matrícula', example: 48030 })
    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    codigoMatricula: number;
}

export class FindCadeirasEpocaEspecialDto {
    @ApiProperty({ description: 'Ano letivo', example: 22 })
    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    anoLectivo: number;

    @ApiProperty({ description: 'Código da matrícula', example: 22 })
    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    codigoMatricula: number;
}

export class InscricaoRecursoDTO {
    @ApiProperty({ description: 'Código da grade curricular do aluno', example: [1328779,1466070] })
    @IsNotEmpty()
    @IsArray()
    @Type(() => Number)
    codigoGradeAluno: number[];

    @ApiProperty({ description: 'Código da matrícula', example: 48030 })
    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    codigoMatricula: number;
}


export class CriarInscricaoRecursoBodyDTO extends OmitType(InscricaoRecursoDTO, ['codigoMatricula'] as const) {}