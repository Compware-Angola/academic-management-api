import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class EstudanteDTO {
    @ApiPropertyOptional({ description: 'Código do curso', example: 10 })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    curso?: number;

    @ApiPropertyOptional({ description: 'Gênero do estudante', example: 'Masculino' })
    @IsOptional()
    @IsString()
    genero?: string;

    @ApiPropertyOptional({ description: 'Código do Ano letivo', example: 1 })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    anoLectivo?: number;

    @ApiPropertyOptional({ description: 'Pesquisa por nome', example: 'João' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Código do Estado da matrícula (Ex: Ativo, Inativo)', example: 1 })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    estadoMatricula?: number;

    // --- NOVOS CAMPOS PARA BATER COM A TELA JAVA ---

    @ApiPropertyOptional({ description: 'Ano Curricular (1, 2, 3...)', example: 1 })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    anoCurricular?: number;

    @ApiPropertyOptional({ description: 'Estado de Aprovação (1 = Aprovado, 2 = Reprovado)', example: 1 })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    estadoAprovacao?: number;

    // --- PAGINAÇÃO ---

    @ApiPropertyOptional({ description: 'Número da página', example: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Número de registros por página', example: 10 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    limit?: number = 10;
}