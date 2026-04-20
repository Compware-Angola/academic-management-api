import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsOptional, IsPositive } from "class-validator";

export class DefinirEspecialidadeDTO {
    @IsNumber()
    @IsPositive()
    @IsOptional()
    @Type(() => Number)
    codigoMatricula: number;

   @IsNumber()
     @IsPositive()
     @IsOptional()
     @Type(() => Number)
    codigoCursoEspecialidade: number;
}