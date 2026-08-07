import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';


export class CursosDoPlanoCursoDto {
    @ApiProperty({
        description: 'Codigo do Curso',
        example: 1,
    })
    @IsNotEmpty()
    codigoCurso: number;
}

export class CreateUCTroncoComumPlanoCursoDto {

    @ApiProperty({
        description: 'Codigo da Classe',
        example: 1,
    })
    @IsNotEmpty()
    codigoClasse: number;

    @ApiProperty({
        description: 'Codigo do Ano Letivo',
        example: 2025,
    })
    @IsNotEmpty()
    anoLetivo: number;

    @ApiProperty({
        description: 'Codigo do Semestre',
        example: 1,
    })
    @IsNotEmpty()
    codigoSemestre: number;

    @ApiProperty({
        description: 'Codigo da Grade',
        example: 1,
    })
    @IsNotEmpty()
    codigoGrade: number;


    @ApiProperty({
        description: 'Array dos cursos',
        isArray: true,
        type: CursosDoPlanoCursoDto,
        example: [{ codigoCurso: 1 }, { codigoCurso: 2 }, { codigoCurso: 3 }],
    })
    @IsNotEmpty()
    codigoCursos: CursosDoPlanoCursoDto[];
}