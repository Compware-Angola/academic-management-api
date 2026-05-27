import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString, IsOptional } from "class-validator";

export class CreateDiscountDto {

    @ApiProperty({ example: 101, description: "Código da matrícula do aluno" })
    @IsNumber()
    codigo_matricula: number;

    @ApiProperty({ example: 5, description: "Código do tipo de desconto" })
    @IsNumber()
    @IsOptional()
    codigo_tipo_desconto?: number;

    @ApiProperty({ example: "SIM", description: "Isentar multa (SIM ou NAO)" })
    @IsString()
    isentar_multa: string;

    @ApiProperty({ example: 10, description: "Código do utilizador" })
    @IsNumber()
    codigo_utilizador: number;

    @ApiProperty({ example: 121, description: "Tipo de taxa de desconto especial" })
    @IsNumber()
    tipo_taxa_desconto_especial: number;

    @ApiProperty({ example: 1, description: "Canal de criação do desconto" })
    @IsNumber()
    canal: number;

    @ApiProperty({ example: 2026, description: "Código do ano lectivo" })
    @IsNumber()
    codigo_anolectivo: number;

    @ApiProperty({ example: "DESCONTO_PARCIAL", description: "Tipo de afectação do desconto" })
    @IsString()
    afectacao: string;

    @ApiProperty({ example: "Desconto por mérito", description: "Observação", required: false })
    @IsString()
    @IsOptional()
    observacao: string;

    @ApiProperty({ example: 1, description: "ID da instituição" })
    @IsNumber()
    instituicao_id: number;

    @ApiProperty({ example: 2, description: "ID do estado do desconto" })
    @IsNumber()
    estatus_desconto_id: number;

    @ApiProperty({ example: 1, description: "Semestre (1 ou 2)" })
    @IsNumber()
    semestre: number;
}