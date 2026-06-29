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

export class VigilanteItemDto {
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

export class UpdateCalendarioProvaDto {
  @ApiProperty({
    description:
      'Código do calendário de prova a editar (identifica o registo)',
    example: 1,
  })
  @IsInt()
  @Type(() => Number)
  codigoCalendario: number;

  @ApiPropertyOptional({
    description: 'Código do tipo de prova',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoTipoProva?: number;

  @ApiPropertyOptional({
    description: 'Código da modalidade da prova',
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoModalidade?: number;

  @ApiPropertyOptional({
    description: 'Código ou número da sala',
    example: 101,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoSala?: number;

  @ApiPropertyOptional({
    description:
      'Código do utilizador responsável (também usado como utilizador de registo das alterações)',
    example: 500,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoUtilizador?: number;

  @ApiPropertyOptional({
    description: 'Código do período letivo',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoPeriodo?: number;

  @ApiPropertyOptional({
    description: 'Código da disciplina (grade curricular)',
    example: 401,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoDisciplina?: number;

  @ApiPropertyOptional({
    description: 'Data da prova no formato YYYY-MM-DD',
    example: '2025-12-30',
  })
  @IsOptional()
  @IsDateString()
  dataProva?: string;

  @ApiPropertyOptional({
    description: 'Duração da prova em minutos',
    example: 120,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  duracaoProva?: number;

  @ApiPropertyOptional({
    description: 'Hora de término da prova (formato HH:MM)',
    example: '12:00',
  })
  @IsOptional()
  @IsString()
  horaTermino?: string;

  @ApiPropertyOptional({
    description: 'Hora de início da prova (formato HH:MM)',
    example: '10:00',
  })
  @IsOptional()
  @IsString()
  horaProva?: string;

  @ApiPropertyOptional({
    description: 'URL com material ou instruções adicionais',
    example: 'https://exemplo.com/prova-material',
  })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({
    description: 'Referência ao horário',
    example: 50,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  Horario?: number;

  @ApiPropertyOptional({
    description: 'Id do prazo',
    example: 236,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  prazoId?: number;

  @ApiPropertyOptional({
    description:
      'Lista de vigilantes. Se enviada (mesmo vazia), substitui por completo os vigilantes atualmente associados à prova. Se omitida, os vigilantes atuais não são alterados.',
    type: [VigilanteItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VigilanteItemDto)
  vigilantes?: VigilanteItemDto[];
}
