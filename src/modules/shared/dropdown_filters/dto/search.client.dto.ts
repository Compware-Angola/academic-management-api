import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum SearchClientType {
  STUDENT = 'STUDENT',
  INSTITUTION = 'INSTITUTION',
}

export class SearchClientDto {
  @ApiProperty({
    example: '40014 ou 005123456LA041 ou 5401138393',
    description: 'BI, código de matrícula ou NIF',
  })
  @IsString()
  @IsNotEmpty()
  searchTerm: string;

  @ApiProperty({
    enum: SearchClientType,
    example: SearchClientType.STUDENT,
    description: 'Tipo de pesquisa',
  })
  @IsEnum(SearchClientType)
  type: SearchClientType;
}
