import { ApiProperty } from '@nestjs/swagger';

export class ListarAvisosPorGruposDto {
  @ApiProperty({
    type: [Number],
    example: [2263, 4],
    description: 'Lista de IDs de grupos para filtrar os avisos',
  })
  grupoIds?: number[];
}