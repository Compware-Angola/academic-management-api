import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class ListarUCDocenteSemAfetacaoFiltroDto {
    @ApiPropertyOptional({ description: 'Ano letivo', example: 21 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    anoLectivoId?: number;

    @ApiPropertyOptional({ description: 'Código do curso', example: 10 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    cursoId?: number;

    @ApiPropertyOptional({ description: 'Código do semestre', example: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    semestreId?: number;

    @ApiPropertyOptional({ description: 'Código da classe', example: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    classeId?: number;
}