import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class AtualizarEstadoGradeCurricularDto {
  @ApiProperty({
    description:
      'Novo estado da grade curricular (ex: 0 para desactivar, 1 para activar)',
    example: 0,
  })
  @IsInt()
  @IsNotEmpty()
  estado: number;

  @ApiProperty({
    description: 'Código do utilizador que está a efectuar a alteração',
    example: 12,
  })
  @IsInt()
  @IsNotEmpty()
  codigoUtilizador: number;
}
