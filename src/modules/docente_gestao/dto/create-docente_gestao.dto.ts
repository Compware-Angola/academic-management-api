// import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// import {
//   IsOptional,
//   IsNumber,
//   IsDate,
//   IsString,
//   IsNotEmpty,
// } from 'class-validator';
// import { Type } from 'class-transformer';

// export class CreateDocenteDto {
//   @ApiProperty({
//     description:
//       'Código do utilizador (FK2_MCA_TB_UTILIZADOR) a associar ao docente',
//     example: 123,
//   })
//   @IsNotEmpty()
//   @IsNumber()
//   codigoUtilizador: number;

//   @ApiPropertyOptional({
//     description: 'Apreciação do docente',
//     example: 'Bom desempenho académico',
//   })
//   @IsOptional()
//   @IsString()
//   apreciacao?: string;

//   @ApiPropertyOptional({
//     description: 'Número mecanográfico do docente',
//     example: 'DOC12345',
//   })
//   @IsOptional()
//   @IsString()
//   nMecanografico?: string;

//   @ApiPropertyOptional({ description: 'ID do escalão', example: 2 })
//   @IsOptional()
//   @IsNumber()
//   fkEscalao?: number;

//   @ApiPropertyOptional({ description: 'Categoria do docente', example: 1 })
//   @IsOptional()
//   @IsNumber()
//   tbCategoriaDocente?: number;

//   @ApiPropertyOptional({
//     description: 'Faculdade associada ao docente',
//     example: 3,
//   })
//   @IsOptional()
//   @IsNumber()
//   faculdade?: number;

//   @ApiPropertyOptional({
//     description: 'Código de validação',
//     example: 'VAL-2024-001',
//   })
//   @IsOptional()
//   @IsString()
//   codigoValidacao?: string;

//   @ApiPropertyOptional({
//     description: 'Valor da hora de trabalho',
//     example: 5000,
//   })
//   @IsOptional()
//   @IsNumber()
//   valorHora?: number;

//   @ApiPropertyOptional({ description: 'ID da candidatura', example: 10 })
//   @IsOptional()
//   @IsNumber()
//   fkCandidatura?: number;

//   @ApiPropertyOptional({
//     description: 'Total de anos de experiência',
//     example: 5,
//   })
//   @IsOptional()
//   @IsNumber()
//   totalAnoExperiencia?: number;

//   @ApiPropertyOptional({
//     description: 'Data de início da docência',
//     example: '2023-01-10',
//   })
//   @IsOptional()
//   @IsDate()
//   @Type(() => Date)
//   dataInicioDocencia?: Date;

//   @ApiPropertyOptional({
//     description: 'Proposta de contratação',
//     example: 'Contrato anual renovável',
//   })
//   @IsOptional()
//   @IsString()
//   propostaDeContratacao?: string;

//   @ApiPropertyOptional({
//     description: 'Valor da hora alternativo',
//     example: 4500,
//   })
//   @IsOptional()
//   @IsNumber()
//   valorhoraAlt?: number;

//   @ApiPropertyOptional({ description: 'Código do contrato', example: 0 })
//   @IsOptional()
//   @IsNumber()
//   codContrato?: number;
// }
