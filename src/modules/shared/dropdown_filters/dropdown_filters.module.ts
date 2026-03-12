import { Module } from '@nestjs/common';

import { DropdownFiltersController } from './dropdown_filters.controller';
import { EscalaoService } from './services/escalao.service';
import { CategoriaDocenteService } from './services/categoria.docente.service';
import { TipoUCService } from './services/tipo-uc.service';

@Module({
  controllers: [DropdownFiltersController],
  providers: [EscalaoService,CategoriaDocenteService,TipoUCService],
})
export class DropdownFiltersModule {}
