import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class GetGradePosGraduacaoDto {
    @ApiProperty({ example: 864 })
    @IsNumber()
    @Type(() => Number)
    codigoPreInscricao: number;
    @ApiProperty({ example: 1 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    codigoCiclo: number;
}