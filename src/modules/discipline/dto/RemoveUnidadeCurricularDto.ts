import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemoveUnidadeCurricularDto {
    @ApiProperty({
        example: 1,
        description: 'Código da unidade curricular',
    })
    @IsInt()
    codigoGrade: number;

    @ApiProperty({
        example: 1,
        description: 'Código do ano lectivo',
    })
    @IsInt()
    codigoAnoLectivo: number;

    @ApiProperty({
        example: 1,
        description: 'Código do curso',
    })
    @IsInt()
    codigoCurso: number;
}