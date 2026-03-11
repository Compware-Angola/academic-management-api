import { Module } from '@nestjs/common';
import { DocenteGestaoService } from './docente_gestao.service';
import { DocenteGestaoController } from './docente_gestao.controller';
import { UcDocenteSemAfetacaoService } from './uc-docente-sem-afetacoa.service';
import { ListarUCDocenteSemAfetacaoController } from './listar-uc-docente-sem-afetacao.controller';

@Module({
  controllers: [DocenteGestaoController, ListarUCDocenteSemAfetacaoController],
  providers: [DocenteGestaoService, UcDocenteSemAfetacaoService],
})
export class DocenteGestaoModule {}
