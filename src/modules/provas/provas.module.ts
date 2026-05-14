import { Module } from '@nestjs/common';
import { ProvasService } from './provas.service';
import { ProvasController } from './provas.controller';
import { HorarioProvaService } from './horario-prova.service';
import { HorarioProvaController } from './horario-prova.controller';

@Module({
  controllers: [ProvasController, HorarioProvaController],
  providers: [ProvasService, HorarioProvaService],
})
export class ProvasModule {}
