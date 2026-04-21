import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';



export class CreateDocumentoUCDto {
  @ApiProperty({ example: 'Certificado Com Notas' })
  @IsString()
  documento: string;
  @ApiPropertyOptional({ example: '23' })
  @IsString()
  @IsOptional()
  anoLetivo?: string;
  @ApiProperty({ example: 'Ativo' })
  @IsString()
  status: string;
  @ApiProperty({ example: 44366 })
  @IsNumber()
  codigoMatricula: number;
  @ApiProperty({ example: 7 })
  @IsNumber()
  tipoDocumento: number;



}