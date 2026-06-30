import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { Type } from "class-transformer"
import { IsInt, IsOptional } from "class-validator"

export class VagasItemDto {
    @ApiPropertyOptional({
        example: 1,
        description: 'Código da vaga',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    codigo_vaga: number

    @ApiProperty({
        example: 1,
        description: 'Código do período',
    })
    @Type(() => Number)
    @IsInt()
    codigo_periodo: number

    @ApiProperty({
        example: 1,
        description: 'Código do curso',
    })
    @Type(() => Number)
    @IsInt()
    codigo_curso: number

    @ApiPropertyOptional({
        example: 1,
        description: 'Código do polo',
    })
    @Type(() => Number)
    @IsOptional()
    @IsInt()
    polo_id: number

    @ApiProperty({
        example: 1,
        description: 'Número de vagas',
    })
    @Type(() => Number)
    @IsInt()
    numero_vagas: number
} 