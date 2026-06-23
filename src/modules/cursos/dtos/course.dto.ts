
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Min, } from "class-validator";

export class CoursesQueryDto {
     @ApiPropertyOptional({ description: 'Pesquisa', example: 'José' })
     @IsOptional()
     @IsString()
     search?: string;


     @ApiPropertyOptional({ description: 'Nivel de Graduação', example: 'GRADUATION' })
     @IsOptional()
     @IsString()
     @IsEnum(["GRADUATION","POST_GRADUATION"])
     @Type(() => String)
     level?: 'GRADUATION' | 'POST_GRADUATION' ='GRADUATION';

     @ApiPropertyOptional({ description: 'Número da página', example: 1 })
     @IsOptional()
     @IsInt()
     @Min(1)
     @Type(() => Number)
     page?: number;

     @ApiPropertyOptional({ description: 'Código da faculdade', example: 1 })
     @IsOptional()
     @IsInt()
     @Type(() => Number)
     falcudadeId?:number

     @ApiPropertyOptional({ description: 'Código do tipo de candidatura', example: 1 })
     @IsOptional()
     @IsInt()
     @Type(() => Number)
     tipocandidatura?:number
   
     @ApiPropertyOptional({ description: 'Número de registros por página', example: 10 })
     @IsOptional()
     @IsInt()
     @Min(10)
     @Type(() => Number)
     limit?: number;


}