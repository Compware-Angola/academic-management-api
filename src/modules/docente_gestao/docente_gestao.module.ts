import { Module } from '@nestjs/common';
import { DocenteGestaoService } from './docente_gestao.service';
import { DocenteGestaoController } from './docente_gestao.controller';

@Module({
  controllers: [DocenteGestaoController],
  providers: [DocenteGestaoService],
})
export class DocenteGestaoModule {}
