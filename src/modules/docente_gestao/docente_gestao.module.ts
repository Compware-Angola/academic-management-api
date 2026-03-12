import { Module } from '@nestjs/common';
import { DocenteGestaoService } from './docente_gestao.service';
import { DocenteGestaoController } from './docente_gestao.controller';
import { UcDocenteSemAfetacaoService } from './docente-sem-afetacoa.service';
import { ListarUCDocenteSemAfetacaoController } from './docente-sem-afetacao.controller';

@Module({
  controllers: [DocenteGestaoController, ListarUCDocenteSemAfetacaoController],
  providers: [DocenteGestaoService, UcDocenteSemAfetacaoService],
})
export class DocenteGestaoModule {}
