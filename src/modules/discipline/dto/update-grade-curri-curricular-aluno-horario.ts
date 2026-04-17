import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsPositive } from "class-validator";
import { Type } from "class-transformer";

export class UpdateGradeCurricularAlunoHorarioDTO {
  @ApiProperty({ example: 1, description: 'Código da grade curricular do aluno' })
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    codigoGradeCurricularAluno: number;
  
    @ApiProperty({ example: 23, description: 'Código do horário' })
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    horarioID: number;
}