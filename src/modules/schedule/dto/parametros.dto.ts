
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsInt,
    IsOptional,
    Min,
    IsIn,
    Max,
    IsString,
} from 'class-validator';

export class ScheduleParamDto {

    @ApiPropertyOptional({
        description: 'Filtrar por tipo de parametro (1 ou 2)',
        example: 1,
        enum: [1, 2],
    })
    @IsOptional()
    @IsInt()
    @IsIn([1, 2], { message: 'Tipo de Parametro deve ser 1 ou 2' })
    @Type(() => Number)
    tipoParametro?: number;

    @ApiPropertyOptional({
        description: 'Pesquisar',
        example: "",

    })
    @IsOptional()
    @IsString()
    @Type(() => String)
    search?: string;


    @ApiPropertyOptional({
        description: 'Filtrar por código do curso',
        example: 15,
    })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    curso?: number;
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
