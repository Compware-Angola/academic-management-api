import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

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

      @ApiPropertyOptional({
        description: 'Número da página',
        example: 1,
        minimum: 1,
        default: 1,
      })
      @IsOptional()
      @IsInt()
      @Min(1)
      @Type(() => Number)
      page?: number = 1;
    
      @ApiPropertyOptional({
        description: 'Quantidade de registros por página (máximo 100)',
        example: 25,
        minimum: 1,
        maximum: 100,
        default: 25,
      })
      @IsOptional()
      @IsInt()
      @Min(1)
      @Max(100)
      @Type(() => Number)
      limit?: number = 25;
}