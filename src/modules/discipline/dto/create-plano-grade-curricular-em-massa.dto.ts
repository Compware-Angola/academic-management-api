import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsInt,
    IsNumber,
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
        description: 'Peso da primeira frequência',
        example: 40,
    })
    @IsNumber()
    pesoPrimeiraFreq: number;

    @ApiProperty({
        description: 'Peso da segunda frequência',
        example: 30,
    })
    @IsNumber()
    pesoSegundaFreq: number;

    @ApiProperty({
        description: 'Peso da prática',
        example: 30,
    })
    @IsNumber()
    pesoPratica: number;

    @ApiProperty({
        description: 'Nota mínima da primeira frequência',
        example: 10,
    })
    @IsNumber()
    notaMinPrimeiraFreq: number;

    @ApiProperty({
        description: 'Nota mínima da segunda frequência',
        example: 10,
    })
    @IsNumber()
    notaMinSegundaFreq: number;

    @ApiProperty({
        description: 'Nota mínima da prática',
        example: 10,
    })
    @IsNumber()
    notaMinPratica: number;
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