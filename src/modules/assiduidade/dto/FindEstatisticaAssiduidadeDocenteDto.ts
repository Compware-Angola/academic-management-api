import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ToBoolean } from 'src/common/decorators/to-boolean.decorator';


export class FindEstatisticaAssiduidadeDocenteDto {
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    anoLectivo?: number = 0;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    semestre?: number = 0;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    curso?: number = 0;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    docente?: number = 0;

    @IsOptional()
    @IsString()
    dataInicial?: string;

    @IsOptional()
    @IsString()
    dataFinal?: string;

    @IsOptional()
    @IsString()
    search?: string

    // 🔽 BOOLEANOS LIMPOS

    @ApiProperty({ required: false, default: false })
    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    naoCobrarFaltas?: boolean = false;

    @ApiProperty({ required: false, default: false })
    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    exigirPresencasConfirmadas?: boolean = false;

    @ApiProperty({ required: false, default: false })
    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    exigirSumariosInseridos?: boolean = false;

    @ApiProperty({ required: false, default: false })
    @IsOptional()
    @ToBoolean()
    @IsBoolean()
    exigirSumariosValidos?: boolean = false;

    // 🔽 PAGINAÇÃO

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    limit?: number = 20;
}