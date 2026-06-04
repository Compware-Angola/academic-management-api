import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { EscalaoService } from './services/escalao.service';
import { ApiTags } from '@nestjs/swagger';
import { CategoriaDocenteService } from './services/categoria.docente.service';
import { TipoUCService } from './services/tipo-uc.service';
import { MatriculaService } from './services/matricula.service';
import { OcupacaoService } from './services/ocupacao.service';
import { ProfissaoService } from './services/profissao.service';
import { NacionalidadeService } from './services/nacionalidade.service';
import { NecessidadeEspecialService } from './services/necessidade-especial.service';
import { AnoLectivoConfirmadosService } from './services/anolectivo-confirmados.service';
import { SituationService } from './services/situation.service';

@ApiTags('DROPDOWN-FILTERS')
@Controller('dropdown-filters')
export class DropdownFiltersController {
  constructor(
    private readonly dropdownFiltersEscalao: EscalaoService,
    private readonly dropdownFiltersCategoriaDocente: CategoriaDocenteService,
    private readonly dropdownFiltersTipoUCService: TipoUCService,
    private readonly matriculaService: MatriculaService,
    private readonly ocupacaoService: OcupacaoService,
    private readonly profissaoService: ProfissaoService,
    private readonly nacionalidadeService: NacionalidadeService,
    private readonly necessidadeEspecialService: NecessidadeEspecialService,
    private readonly anoLectivoConfirmadosService: AnoLectivoConfirmadosService,
    private readonly situationService: SituationService,
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
  @Get('matricula/estado')
  @HttpCode(HttpStatus.OK)
  async findEstadoMatricula() {
    return this.matriculaService.estadoMatriculaDropdown();
  }
  @Get('ocupacao')
  async getOcupacaoDropdown() {
    return this.ocupacaoService.getOcupacaoDropdown();
  }
  @Get('profissao')
  async getProfissaoDropdown() {
    return this.profissaoService.getProfissaoDropdown();
  }
  @Get('nacionalidade')
  async getNacionalidadeDropdown() {
    return this.nacionalidadeService.getNacionalidades();
  }
  @Get('anolectivo-confirmado/:matricula')
  async getAnoLectivoConfirmados(
    @Param('matricula', ParseIntPipe) matricula: number,
  ) {
    return this.anoLectivoConfirmadosService.getAnoLectivoByMatricula(
      matricula,
    );
  }
  @Get('necessidades-especiais')
  async getNecessidadeEspeciasDropdown() {
    return this.necessidadeEspecialService.getNecessidadeEspecialDropdown();
  }
  @Get('situacao')
  async getSituationDropdown() {
    return this.situationService.situation();
  }
  @Get('motivo-situacao')
  async getReasonSituationDropdown(
    @Query('estado', new ParseIntPipe()) estado?: number,
  ) {
    return this.situationService.reasonSituation(estado);
  }
 
}
