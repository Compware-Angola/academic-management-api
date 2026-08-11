// dto/create-unidade-curricular-departamento.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsPositive, ArrayMinSize } from 'class-validator';

export class CreateUnidadeCurricularDepartamentoDto {

  @ApiProperty({ example: 1, description: 'Código do departamento' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  codigoDepartamento: number;



  @ApiProperty({ example: 999, description: 'Código da classe para cadeiras tronco em Componente de Formação Comum ou Ramo em Componente de Formação Específica' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  codigoClasse: number;




  @ApiProperty({
    example: [{ codigoDisciplina: 1 }, { codigoDisciplina: 2 }],
    description: 'Lista de disciplinas',
    type: () => [DisciplinaItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  disciplinas: DisciplinaItemDto[];
}

export class DisciplinaItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  codigoDisciplina: number;
}