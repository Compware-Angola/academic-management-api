import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional, IsPositive } from "class-validator";

export class DefinirEspecialidadeDTO {
  @ApiProperty({
    example: 1,
    description: "Código da matrícula",
  })
    @IsNumber()
    @IsPositive()
    @IsOptional()
    @Type(() => Number)
    codigoMatricula: number;

  @ApiProperty({
    example: 1,
    description: "Código do curso da especialidade",
  })
   @IsNumber()
     @IsPositive()
     @IsOptional()
     @Type(() => Number)
    codigoCursoEspecialidade: number;
}