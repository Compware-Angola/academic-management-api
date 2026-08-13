import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CursosDoPlanoCursoDto {
    @ApiProperty({
        description: 'Codigo do Semestre',
        example: 1,
    })
    @IsNotEmpty()
    @IsInt()
    codigoSemestre: number;
    @ApiProperty({
        description: 'Codigo do Curso',
        example: 1,
    })
    @IsNotEmpty()
    @IsInt()
    codigoCurso: number;

    @ApiProperty({
        description: 'Codigo da Classe',
        example: 1,
    })
    @IsNotEmpty()
    @IsInt()
    codigoClasse: number;
}

export class CreateUCTroncoComumPlanoCursoDto {
    @ApiProperty({
        description: 'Codigo do Ano Letivo',
        example: 2025,
    })
    @IsNotEmpty()
    @IsInt()
    anoLetivo: number;



    @ApiProperty({
        description: 'Codigo da Grade',
        example: 1,
    })
    @IsNotEmpty()
    @IsInt()
    codigoGrade: number;

    @ApiProperty({
        description: 'Array dos cursos',
        isArray: true,
        type: CursosDoPlanoCursoDto,
        example: [
            { codigoSemestre: 1, codigoCurso: 1, codigoClasse: 1 },
            { codigoSemestre: 1, codigoCurso: 2, codigoClasse: 1 },
            { codigoSemestre: 2, codigoCurso: 3, codigoClasse: 2 },
        ],
    })
    @IsArray()
    @IsNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => CursosDoPlanoCursoDto)
    cursos: CursosDoPlanoCursoDto[];
}