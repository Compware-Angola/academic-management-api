import { Controller, Get } from '@nestjs/common';
import { EscalaoService } from './services/escalao.service';
import { ApiTags } from '@nestjs/swagger';
import { CategoriaDocenteService } from './services/categoria.docente.service';
import { TipoUCService } from './services/tipo-uc.service';

@ApiTags("DROPDOWN-FILTERS")
@Controller('dropdown-filters')
export class DropdownFiltersController {
  constructor(private readonly dropdownFiltersEscalao: EscalaoService,
  private readonly  dropdownFiltersCategoriaDocente:CategoriaDocenteService,
private readonly  dropdownFiltersTipoUCService :TipoUCService
) {}

@Get('escalao')
async getEscalaoDropdown() {
  return this.dropdownFiltersEscalao.getEscalaoDropdown();
}
@Get('categoria/docente')
async getCategoriaDropdown() {
  return this.dropdownFiltersCategoriaDocente.getCategoriaDropdown();
}
@Get('tipo-uc')
async getTipoUcDropdown() {
  return this.dropdownFiltersTipoUCService.getTipoUcDropdown();
}
}
