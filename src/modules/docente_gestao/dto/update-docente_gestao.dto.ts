import { PartialType } from '@nestjs/swagger';
import { CreateDocenteGestaoDto } from './create-docente_gestao.dto';

export class UpdateDocenteGestaoDto extends PartialType(CreateDocenteGestaoDto) {}
