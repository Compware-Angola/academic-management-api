import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateSumarioDto } from './create-sumario.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSumarioDto extends PartialType(CreateSumarioDto) {

  @ApiProperty({
    description: 'Justificação do Director',
    example: 'Sumário validado após verificação',
    required: false,
  })
  @IsOptional()
  @IsString()
  justificacao_director?: string;

}