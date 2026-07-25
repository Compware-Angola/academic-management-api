import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional } from "class-validator";

export class NextClassDTO {
    @ApiProperty({ required: false, type: Number, example: 23 })
    @Type(() => Number)
    @IsOptional()
    anoLectivo?: number;
}