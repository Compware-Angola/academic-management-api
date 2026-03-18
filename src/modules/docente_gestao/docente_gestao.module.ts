import { Module } from '@nestjs/common';
import { DocenteGestaoService } from './docente_gestao.service';
import { DocenteGestaoController } from './docente_gestao.controller';
import { UcDocenteSemAfetacaoService } from './docente-sem-afetacoa.service';
import { DocenteSemAfetacaoController } from './docente-sem-afetacao.controller';
import { DocenteCandidaturaController } from './docente-candidatura.controller';
import { DocenteCandidaturaService } from './docente-candidatura.service';

@Module({
  controllers: [DocenteGestaoController, DocenteSemAfetacaoController, DocenteCandidaturaController],
  providers: [DocenteGestaoService, UcDocenteSemAfetacaoService, DocenteCandidaturaService],
})
export class DocenteGestaoModule {}
