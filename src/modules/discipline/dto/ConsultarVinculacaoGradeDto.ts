import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConsultarVinculacaoGradeDto {
    @ApiPropertyOptional({
        example: 2,
        description: 'Código da grade curricular',
        required: false,
    })
    @Type(() => Number)
    @IsInt()
    codigoGrade: number;

    @ApiPropertyOptional({
        example: 2,
        description: 'Código do ano lectivo',
        required: false,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    anoLetivo: number;

    @ApiPropertyOptional({
        example: 2,
        description: 'Código do curso',
        required: false,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    codigoCurso?: number;
}