import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RemoveUnidadeCurricularDto {
    @ApiProperty({
        example: 1,
        description: 'Código da unidade curricular',
    })
    @IsInt()
    @Type(() => Number)
    codigoGrade: number;

    @ApiProperty({
        example: 1,
        description: 'Código do ano lectivo',
    })
    @IsInt()
    @Type(() => Number)
    codigoAnoLectivo: number;

    @ApiProperty({
        example: 1,
        description: 'Código do curso',
    })
    @IsInt()
    @Type(() => Number)
    codigoCurso: number;
}