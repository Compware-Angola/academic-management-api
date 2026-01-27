import {
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
class VigilanteItemDto {
  @ApiProperty({
    description: 'Código do utilizador/docente que será vigilante',
    example: 1965,
  })
  @IsNumber()
  codigoUtilizador: number;

  @ApiProperty({
    description: 'Descrição do vigilante',
    example: 'Isaac Bunga',
  })
  @IsString()
  desc: string;
}

export class CreateCalendarioProvaDto {
  @ApiPropertyOptional({
    description: 'Código único do calendário',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  codigoCalendario?: number;

  @ApiProperty({
    description: 'Código do tipo de prova',
    example: 10,
  })
  @IsInt()
  codigoTipoProva: number;

  @ApiProperty({
    description: 'Código da modalidade da prova',
    example: 20,
  })
  @IsInt()
  codigoModalidade: number;

  @ApiProperty({
    description: 'Código ou número da sala',
    example: 101,
  })
  @IsInt()
  codigoSala: number;

  @ApiProperty({
    description: 'Código do utilizador (professor ou responsável)',
    example: 500,
  })
  @IsInt()
  codigoUtilizador: number;

  @ApiProperty({
    description: 'Código do período letivo',
    example: 1,
  })
  @IsInt()
  codigoPeriodo: number;

  @ApiProperty({
    description: 'Código da disciplina',
    example: 401,
  })
  @IsInt()
  codigoDisciplina: number;

  @ApiProperty({
    description: 'Data da prova no formato YYYY-MM-DD',
    example: '2025-12-30',
  })
  @IsDateString()
  dataProva: string;

  @ApiProperty({
    description: 'Duração da prova em minutos',
    example: 120,
  })
  @IsInt()
  duracaoProva: number;

  @ApiProperty({
    description: 'Hora de término da prova (formato HH:MM)',
    example: '12:00',
  })
  @IsString()
  horaTermino: string;

  @ApiProperty({
    description: 'Hora de início da prova (formato HH:MM)',
    example: '10:00',
  })
  @IsString()
  horaProva: string;

  @ApiPropertyOptional({
    description: 'URL com material ou instruções adicionais',
    example: 'https://exemplo.com/prova-material',
  })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({
    description: 'Referência a outro utilizador',
    example: 600,
  })
  @IsInt()
  utilizador: number;

  @ApiPropertyOptional({
    description: 'Referência ao horário',
    example: 50,
  })
  @IsInt()
  Horario: number;

  @ApiPropertyOptional({
    description: 'Id da Prazo',
    example: 236,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  prazoId: number;

  @ApiPropertyOptional({
    description: 'Ano Lectivo',
    example: 22,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  anoLectivo: number;

  @ApiPropertyOptional({
    description: 'Id da candidatura',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tipoCandidatura: number;

  @ApiPropertyOptional({
    description: 'Id do semestre',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  semestre: number;

  @ApiProperty({
    description: 'Lista de vigilantes a serem associados ao calendário',
    type: [VigilanteItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VigilanteItemDto)
  vigilantes: VigilanteItemDto[];
}
