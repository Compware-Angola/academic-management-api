import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
  ValidationPipe,
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
import { SearchClientDto } from './dto/search.client.dto';
import { SearchClientService } from './services/search-client.service';
import { GrauAcademicoService } from './services/grau-academico.service';
import { DocentesService } from 'src/modules/docentes/docentes.service';
import { DocenteDropDownService } from './services/docente.service';
import { FindDocentesDTO } from 'src/modules/academic_activities/dto/find-docente.dto';
import { FindUnidadesCurricularesDTO } from './dto/find-unidades-curriculares.dto';
import { GradeCurricularService } from './services/gradecurricular.service';

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
    private readonly searchClientService: SearchClientService,
    private readonly grauAcademicoService: GrauAcademicoService,

    private readonly docenteDropDownService: DocenteDropDownService,
    private readonly gradeCurricularService: GradeCurricularService,
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

  @Get('search-client')
  async searchClient(@Query() query: SearchClientDto) {
    return this.searchClientService.find(query);
  }

  @Get('grau-academico/dropdown')
  async getGrauAcademicoDropdown() {
    return this.grauAcademicoService.getGrauAcademicoDropdown();
  }
  @Get('docentes')
  async findDocentes(@Query() query: FindDocentesDTO) {
    return this.docenteDropDownService.findDocentes(query);
  }
  @Get('grade-curricular')
  async findGradeCurricular(@Query() query: FindUnidadesCurricularesDTO) {
    return this.gradeCurricularService.findUnidadesCurriculares(query);
  }
}
