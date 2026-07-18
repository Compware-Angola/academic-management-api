import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class NextClassDTO {

    @ApiProperty({ required: false, type: Number, example: 23 })
    @Type(() => Number)
    anoLectivo: number;
}