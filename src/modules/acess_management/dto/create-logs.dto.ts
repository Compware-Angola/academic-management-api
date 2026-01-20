import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLogsDTO {
  @ApiProperty({
    description: 'Descrição detalhada da ação realizada (ex: "Acesso ao módulo de finanças")',
    example: 'Utilizador acedeu ao relatório mensal de vendas',
    maxLength: 500,
    required: false,
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  descricao?: string;

  @ApiProperty({
    description: 'ID do acesso/registo relacionado (chave estrangeira)',
    example: 145,
    type: Number,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  fkAcesso?: number;

  @ApiProperty({
    description: 'ID da funcionalidade/módulo onde a ação ocorreu',
    example: 32,
    type: Number,
  })
  @IsNumber()
  fkFuncionalidade: number;

  @ApiProperty({
    description: 'ID do utilizador responsável pela ação (quem executou)',
    example: 1001,
    type: Number,
  })
  @IsNumber()
  fkUtilizadorResponsavel: number;

  @ApiPropertyOptional({
    description: 'ID do grupo afetado pela ação (opcional, pode ser null)',
    example: 78,
    type: Number,
    nullable: true,
  })
  @IsNumber()
  @IsOptional()
  fkGrupoAfetado?: number | null;

  @ApiProperty({
    description: 'ID do tipo de operação realizada (ex: 1=Login, 2=Create, 3=Update, etc.)',
    example: 4,
    type: Number,
  })
  @IsNumber()
  fkOperacaoLog: number;

  @ApiProperty({
    description: 'Endereço IP do cliente que originou a ação',
    example: '196.32.145.78',
    type: String,
  })
  @IsString()
  @MaxLength(45) 
  ip: string;

}