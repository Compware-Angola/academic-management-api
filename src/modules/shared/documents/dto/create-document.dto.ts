import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';

<<<<<<< HEAD

=======
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
>>>>>>> 1e1a328 (feat:update data)

export class CreateDocumentoUCDto {
  @ApiProperty({ example: 'Certificado Com Notas' })
  @IsString()
  documento: string;
<<<<<<< HEAD
=======

>>>>>>> 1e1a328 (feat:update data)
  @ApiPropertyOptional({ example: '23' })
  @IsString()
  @IsOptional()
  anoLetivo?: string;
<<<<<<< HEAD
  @ApiProperty({ example: 'Ativo' })
  @IsString()
  status: string;
  @ApiProperty({ example: 44366 })
  @IsNumber()
  codigoMatricula: number;
=======

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

>>>>>>> 1e1a328 (feat:update data)
  @ApiProperty({ example: 7 })
  @IsNumber()
  tipoDocumento: number;

<<<<<<< HEAD


=======
  @ApiProperty({ type: RefUtilizadorDto })
  @IsObject()
  refUtilizador: RefUtilizadorDto;

  @ApiProperty({ example: '115246' })
  @IsString()
  codigo: string;
>>>>>>> 1e1a328 (feat:update data)
}