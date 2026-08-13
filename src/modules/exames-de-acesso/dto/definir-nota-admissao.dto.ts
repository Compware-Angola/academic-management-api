import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsInt,
    IsNumber,
    Max,
    Min,
    ValidateNested,
} from 'class-validator';

export class CandidatoNotaDto {
    @ApiProperty({
        description: 'ID do candidato',
        example: 1,
    })
    @IsInt()
    candidatoId: number;

    @ApiProperty({
        description: 'ID da prova',
        example: 1,
    })
    @IsInt()
    provaId: number;

    @ApiProperty({
        description: 'Nota do candidato',
        example: 1,
    })
    @IsNumber()
    @Min(0)
    @Max(20)
    nota: number;
}

export class DefinirNotaAdmissaoDto {
    @ApiProperty({
        description: 'Candidatos com notas definidas',
        example: [
            {
                candidatoId: 1,
                provaId: 1,
                nota: 10,
            },
            {
                candidatoId: 2,
                provaId: 1,
                nota: 15,
            },
        ],
    })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CandidatoNotaDto)
    candidatos: CandidatoNotaDto[];
}