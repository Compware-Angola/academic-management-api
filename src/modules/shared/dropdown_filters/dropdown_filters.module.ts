import { Module } from '@nestjs/common';

import { DropdownFiltersController } from './dropdown_filters.controller';
import { EscalaoService } from './services/escalao.service';
import { CategoriaDocenteService } from './services/categoria.docente.service';
import { TipoUCService } from './services/tipo-uc.service';
import { MatriculaService } from './services/matricula.service';
import { OcupacaoService } from './services/ocupacao.service';
import { ProfissaoService } from './services/profissao.service';

@Module({
  controllers: [DropdownFiltersController],
  providers: [EscalaoService,CategoriaDocenteService,TipoUCService,MatriculaService,OcupacaoService,ProfissaoService],
})
export class DropdownFiltersModule {}
