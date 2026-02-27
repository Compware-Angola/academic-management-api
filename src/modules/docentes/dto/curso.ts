import { ApiProperty } from '@nestjs/swagger';

export class CursoDto {
  @ApiProperty({ example: 10 })
  codigo: number;

  @ApiProperty({ example: 'Engenharia Informática' })
  designacao: string;
}
export class CursosResponseDto {
  @ApiProperty({ type: [CursoDto] })
  data: CursoDto[];
}