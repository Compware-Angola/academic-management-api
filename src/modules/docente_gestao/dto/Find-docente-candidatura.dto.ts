import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class FindDocenteCandidaturaDto {
    @ApiPropertyOptional({ description: 'ID do curso de formação', example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    cursoFormacaoId?: number;

    @ApiPropertyOptional({ description: 'ID do grau académico', example: 2 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    grauAcademicoId?: number;

    @ApiPropertyOptional({ description: 'ID do gênero (Sexo)', example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    generoId?: number;

    @ApiPropertyOptional({ description: 'ID do estado da candidatura', example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    estadoId?: number;

    @ApiPropertyOptional({ description: 'Data de início (DD/MM/YYYY)', example: '01/01/2026' })
    @IsOptional()
    @IsString()
    dataInicio?: string;
 @ApiPropertyOptional({ description: 'Pesquisa', example: 'Nome do candidato' })
    @IsOptional()
    @IsString()
    search?: string;
    @ApiPropertyOptional({ description: 'Data de fim (DD/MM/YYYY)', example: '13/03/2026' })
    @IsOptional()
    @IsString()
    dataFim?: string;
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