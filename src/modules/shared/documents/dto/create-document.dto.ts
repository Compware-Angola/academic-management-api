import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';

export class RefUtilizadorDto {
  @ApiProperty({ example: 1556 })
  pk: number;

  @ApiProperty({ example: 'Margarida da Silva Rodrigues' })
  desc: string;

  @ApiProperty({ example: 'black' })
  corLetra: string;

  @ApiProperty({ example: false })
  disponivel: boolean;
}

export class CreateDocumentoUCDto {
  @ApiProperty({ example: 'Certificado Com Notas' })
  @IsString()
  documento: string;

  @ApiPropertyOptional({ example: '23' })
  @IsString()
  @IsOptional()
  anoLetivo?: string;

  @ApiPropertyOptional({ example: 'João Silva' })
  @IsString()
  @IsOptional()
  utilizador?: string;

  @ApiProperty({ example: 'Ativo' })
  @IsString()
  status: string;

  @ApiProperty({ example: '6E7F5E70' })
  @IsString()
  codigoDocumento: string;

  @ApiProperty({ example: 44366 })
  @IsNumber()
  codigoMatricula: number;

  @ApiProperty({ example: 7 })
  @IsNumber()
  tipoDocumento: number;

  @ApiProperty({ type: RefUtilizadorDto })
  @IsObject()
  refUtilizador: RefUtilizadorDto;

  @ApiProperty({ example: '115246' })
  @IsString()
  codigo: string;
}