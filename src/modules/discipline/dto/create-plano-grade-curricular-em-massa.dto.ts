import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsInt,
    IsOptional,
    ValidateNested,
} from 'class-validator';

export class ItemGradeCurricularDto {
    @ApiProperty({
        description: 'Código da grade curricular',
        example: 1,
    })
    @IsInt()
    codigoGradeCurricular: number;

    @ApiProperty({
        description: 'Activa a prova Oral para esta unidade curricular no plano',
        example: false,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    temOral?: boolean;

    @ApiProperty({
        description:
            'Activa a componente Prática para esta unidade curricular no plano',
        example: false,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    temPratica?: boolean;
}

export class CreatePlanoGradeCurricularEmMassaDto {
    @ApiProperty({
        description: 'Código do curso',
        example: 1,
    })
    @IsInt()
    codigoCurso: number;

    @ApiProperty({
        description: 'Código do ano lectivo',
        example: 2026,
    })
    @IsInt()
    codigoAnoLectivo: number;

    @ApiProperty({
        description: 'Lista de itens (grades curriculares) a adicionar ao plano do curso',
        type: [ItemGradeCurricularDto],
    })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ItemGradeCurricularDto)
    itens: ItemGradeCurricularDto[];
}
