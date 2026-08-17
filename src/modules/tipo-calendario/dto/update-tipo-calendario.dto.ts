import { PartialType } from '@nestjs/mapped-types';
import { CreateTipoCalendarioDto } from './create-tipo-calendario.dto';

export class UpdateTipoCalendarioDto extends PartialType(
  CreateTipoCalendarioDto,
) {}
