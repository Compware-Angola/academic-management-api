import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  ArrayMinSize,
  ArrayUnique,
} from 'class-validator';

export class CreateUnidadesCurricularesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  codigosDisciplina: number[];

  @IsInt()
  @IsNotEmpty()
  codigoAnoLectivo: number;

  @IsInt()
  @IsNotEmpty()
  codigoCurso: number;

  @IsInt()
  @IsNotEmpty()
  codigoClasse: number;

  @IsOptional()
  @IsInt()
  codigoSemestre: number;
}
