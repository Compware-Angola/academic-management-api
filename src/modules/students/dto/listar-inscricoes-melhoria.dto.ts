import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt } from "class-validator";

export class ListarInscricoesMelhoriaDto {
  @ApiProperty({ example: 61610 })
  @Type(() => Number)
  @IsInt()
  codigoMatricula: number;
}