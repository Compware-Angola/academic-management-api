import { ApiProperty } from '@nestjs/swagger';

export class CadeiraDto {
  @ApiProperty({ example: 100 })
  codigo: number;

  @ApiProperty({ example: 'Algoritmos' })
  nome_cadeira: string;

  @ApiProperty({ example: '10ª Classe' })
  codigo_classe: string;
}


export class CadeirasResponseDto {
  @ApiProperty({ type: [CadeiraDto] })
  data: CadeiraDto[];
}
