import { PartialType } from '@nestjs/swagger';
import { CreatePlanoEstudoDto } from './create-plano_estudo.dto';

export class UpdatePlanoEstudoDto extends PartialType(CreatePlanoEstudoDto) {}
