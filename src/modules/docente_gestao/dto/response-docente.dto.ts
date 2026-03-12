// response-docente.dto.ts
import { ApiProperty } from '@nestjs/swagger';

class DocenteListItemDto {
  @ApiProperty() numero_mec: string;
  @ApiProperty() nome: string;
  @ApiProperty() email: string;
  @ApiProperty() escalao: string;
  @ApiProperty() categoria: string;
  @ApiProperty() grau_academico: string;
}

export class ListDocentesResponseDto {
  @ApiProperty({ type: [DocenteListItemDto] })
  data: DocenteListItemDto[];

  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}