import { PartialType } from '@nestjs/mapped-types';
import { CreatePreInscritoDto } from './create-pre-inscrito.dto';

export class UpdatePreInscritoDto extends PartialType(CreatePreInscritoDto) {}
