// src/shared/dto/referencia.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ReferenciaDto {
  @ApiProperty({ example: 1, description: 'Código/ID da referência' })
  codigo: number;

  @ApiProperty({ example: 'Solteiro(a)', description: 'Descrição/Nome' })
  designacao: string;

  constructor(codigo: number, designacao: string) {
    this.codigo = codigo;
    this.designacao = designacao;
  }
}