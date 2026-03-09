import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsObject, IsNotEmpty, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, Validate } from 'class-validator';


@ValidatorConstraint({ name: 'isNumberOrBoolean', async: false })
export class IsNumberOrBooleanConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    return typeof value === 'number' || typeof value === 'boolean';
  }

  defaultMessage(args: ValidationArguments) {
    return `O campo ${args.property} deve ser do tipo number ou boolean.`;
  }
}
export class ParametroArgsDto {
  @ApiProperty({ 
    description: 'Valor do parâmetro (pode ser número ou booleano)', 
    oneOf: [
      { type: 'number' },
      { type: 'boolean' }
    ],
    example: 7 
  })
  @IsNotEmpty()
  @Validate(IsNumberOrBooleanConstraint) // Validação estrita de tipo
  valor: number | boolean;
}


export class ParametroResponseDto {
  @ApiProperty({ example: 1 })
  pk_parametro: number;

  @ApiProperty({ example: 'Tamanho Mínimo do Sumário' })
  designacao: string;

  @ApiProperty({ example: 'tms' })
  sigla: string;

  @ApiProperty({ example: 'Descrição opcional', nullable: true })
  descricao: string | null;

  @ApiProperty({ type: ParametroArgsDto })
  args: ParametroArgsDto;
}

export class ListParametrosResponseDto {
  @ApiProperty({ type: [ParametroResponseDto] })
  data: ParametroResponseDto[];
}



// 2. Aplicamos no DTO


export class UpdateParametroDto {
  @ApiProperty({ type: ParametroArgsDto })
  @IsObject()
  @IsNotEmpty()
  args: ParametroArgsDto;
}