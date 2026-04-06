import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  Query,
  Put,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  AssessmentService,
  NotaLancadaResponseDto,
} from './assessment.service';

import { BuscarNotasDto } from './dto/buscar-notas.dto';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { ListarUnidadesCurricularesDto } from './dto/listar-unidades-curriculares.dto';
import { DefineFormulaUcService } from './define_formula_uc.service';
import { AtualizarFormulaDto } from './dto/atualizar-formula.dto';
import { DefinirOralGradeDto } from './dto/definir-oral-grade.dto';
import { ListarDefinirOralDto } from './dto/listar-definir-oral.dto';
import { DefineFormulaUcOralService } from './define_formula_uc_oral.service';
import { AtualizarStatusOralDto } from './dto/atualizar-status-oral.dto';
import { BuscarDisciplinasProvaDto } from './dto/buscar-disciplinas-prova.dto';
import { StudentFiltersDto } from './dto/studenty-filter.dto';
import { NoteReleaseService } from './note_release.service';
import {
  StudentEvaluationArrayDto,
  StudentEvaluationDto,
} from './dto/student-evaluation.dto';
import { HistoryNoteReleaseService } from './history_note_release.service';
import { FilterCurriculumGradeAlunoDto } from './dto/filter-student-curriculum.dto';
import { HistoryNoteReleaseDto } from './dto/history_note_release.dto';
import { GeneralParametersForEvaluationService } from './general_parameters_for_evaluation.service';
import {
  CreateParametroAvaliacaoMutueDto,
  UpdateParametroAvaliacaoMutueDto,
} from './dto/parametros-avaliacoes.dto';
import { UpdateParametroAvaliacaoAttendanceListDto } from './dto/update-parametro-avaliacao-attendance-list.dto';
import { FiltroLancamentoPautaDto } from './dto/filtro-lancamento-pauta.dto';
import { AgendaLaunchService } from './agenda_launch.service';
import { CreateLancamentoPautaDto } from './dto/create-lancamento-pauta.dto';
import { UpdateEstadoPautaDto } from './dto/update-estado-pauta.dto';
import { GeneralAgendaDto } from './dto/list-general-agenda.dto';
import { GenaralAgendaService } from './general_agenda.service';
import { getAttendanceListDto } from './dto/get-attendanceList.dto';
import { AttendanceListService } from './attendancelist.service';
import { StudentEnrolledByAssessmentDTO } from './dto/student-enrolled-by-assessment.dto';
import { StudentsEnrolledByAssessmentsService } from './students-enrolled-by-assessments.service';
import { PermissionAssessmentDTO } from './dto/permission-assessment.dto';
import { PermissionAssessmentsService } from './permission-assessment.service';
import { CreatePermissionAssessmentDTO } from './dto/create-permission-assessment.dto';
import { StatisticAssessmentDTO } from './dto/statistic-assessment.dto';
import { StatisticAssessmentsService } from './statistic-assessment.service';
import { MarkingAssessmentService } from './making-assessment.service';
import { MarkingAssessmentDTO } from './dto/marking-assessment.dto';
import { UpdatePermissionEditScheduleDto } from '../schedule/dto/update-permission-edit-schedule.dto';
import { ViewNotesService } from './view-notes.service';
import { FetchViewNotesDTO } from './dto/fetch-view-notes.dto';
// Adicionado da branch develop (funcionalidade útil que não existia na HEAD)
import { BookTestService } from './book_test.service';
import { CreateCalendarioProvaDto } from './dto/CreateCalendarioProvaDto';
import { PermissionsGuard } from '../common/secret/permissions.guard';
import { RemoteJwtAuthGuard } from '../common/guard/remote.jwt-auth.guard';
import { AccessLogHelper } from '../common/helpers/access-log.helper';
import { HttpService } from '@nestjs/axios';
import { buildFormulaLog } from './util/buildFormulaLog';
import { RequiredPermissions } from '../common/pipes/permissions.decorator';
import { PermissionTypeDetails } from '../common/enums/permission.type';
import { PromptGetPermissionLaunchDTO } from './dto/prompt-get-permission-launch.dto';

@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('assessment')
export class AssessmentController {
  constructor(
    private readonly genaralAgendaService: GenaralAgendaService,
    private readonly agendaLaunch: AgendaLaunchService,
    private readonly generalParametersForEvaluationService: GeneralParametersForEvaluationService,
    private readonly historyNoteReleaseService: HistoryNoteReleaseService,
    private readonly noteReleaseService: NoteReleaseService,
    private readonly service: AssessmentService,
    private readonly defineFormulaUcService: DefineFormulaUcService,
    private readonly oralService: DefineFormulaUcOralService,
    private readonly attendanceService: AttendanceListService,
    private readonly studentAssessmentService: StudentsEnrolledByAssessmentsService,
    private readonly permissionService: PermissionAssessmentsService,
    private readonly statisticService: StatisticAssessmentsService,
    private readonly markingAssessmentService: MarkingAssessmentService,
    private readonly viewNotesService: ViewNotesService,
    private httpService: HttpService,
    private readonly calendarioProvaService: BookTestService,
  ) {}

  @Post('upsert')
  @ApiOperation({
    summary: 'Criar ou atualizar uma avaliação do aluno',
    description:
      'Faz um INSERT se a avaliação não existir ou UPDATE se já existir para o mesmo aluno, tipo de prova e época.',
  })
  @ApiResponse({
    status: 200,
    description: 'Avaliação criada ou atualizada com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos enviados.',
  })
  async upsertEvaluation(
    @Body() dto: StudentEvaluationArrayDto,
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const user = req.user;
    const result = await this.noteReleaseService.upsertStudentEvaluation(
      dto,
      user,
    );
    await AccessLogHelper.logAccess(this.httpService, {
      descricao: `Lançamento/Atualização de avaliação do aluno - Código da grade Curricular do Aluno: , Tipo de Avaliação: ${dto[0].tipoAvaliacao}, Época: ${dto[0].epoca}`,
      fkAcesso: 7,
      fkUtilizadorResponsavel: req.user.sub,
      ip: ip,
    });
    return result;
  }

  @Post('parametros-avaliacoes')
  @ApiOperation({ summary: 'Cria um novo parâmetro de avaliação MUTUE' })
  @ApiResponse({ status: 201, description: 'Parâmetro criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async createParametro(
    @Body(ValidationPipe) dto: CreateParametroAvaliacaoMutueDto,
  ) {
    return this.generalParametersForEvaluationService.createParametro(dto);
  }

  @Get('pautas-geral')
  @RequiredPermissions(PermissionTypeDetails.PAUTA_GERAL_POR_UC.sigla)
  async getAllPauta(@Query() query: GeneralAgendaDto) {
    return this.genaralAgendaService.findAll(query);
  }

  @Put('parametros-avaliacoes/:parametroId')
  @ApiOperation({
    summary: 'Atualiza um parâmetro de avaliação MUTUE existente',
  })
  @ApiResponse({ status: 200, description: 'Parâmetro atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Parâmetro não encontrado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async updateParametro(
    @Param('parametroId', ValidationPipe) parametroId: number,
    @Body(ValidationPipe) dto: UpdateParametroAvaliacaoMutueDto,
  ) {
    return this.generalParametersForEvaluationService.updateParametro(
      dto,
      parametroId,
    );
  }

  @Get('search-curriculum-plan-student')
  async searchCurricularByStudenty(
    @Query() params: FilterCurriculumGradeAlunoDto,
  ) {
    return this.historyNoteReleaseService.searchCurricularByStudenty(params);
  }

  @Get('get-history-note-release')
  @ApiOperation({
    summary: 'Busca o histórico de lançamento de notas',
    description: `
    - Se informar apenas <code>codigo_grade_curricular_aluno</code>: retorna o histórico dessa disciplina específica.<br>
    - Caso contrário: precisa informar <code>codigoAnoLectivo</code> + <code>codigoMatricula</code> para buscar todas as disciplinas do aluno.
  `,
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico retornado com sucesso (pode ser array vazio)',
  })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros inválidos ou combinação incorreta',
  })
  @RequiredPermissions(PermissionTypeDetails.HISTORICO_LANCAMENTO_NOTAS.sigla)
  async historyNoteRelease(@Query() params: HistoryNoteReleaseDto) {
    return this.historyNoteReleaseService.historyNoteRelease(params);
  }

  @Get('list-presence-attendance')
  @ApiOperation({ summary: 'Obter lista de presenças/faltas com filtros' })
  @ApiResponse({ status: 200, description: 'Lista retornada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos.' })
  @RequiredPermissions(PermissionTypeDetails.LISTA_PRESENCA.sigla)
  async getAttendanceList(@Query(ValidationPipe) dto: getAttendanceListDto) {
    return this.attendanceService.getAttendanceList(dto);
  }

  // Endpoint exclusivo da branch develop – mantido
  @Post('create-calendario-prova')
  @ApiOperation({ summary: 'Criar um novo agendamento de prova' })
  @ApiResponse({ status: 201, description: 'Prova agendada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async createCalendarioProva(@Body() dto: CreateCalendarioProvaDto) {
    return this.calendarioProvaService.createCalendarioProva(dto);
  }

  @Get('parametros-avaliacoes')
  @ApiOperation({
    summary: 'Lista os parâmetros de avaliações ativos',
    description: `
    Retorna todos os registros da tabela <code>FK2_TB_PARAMETROS_AVALIACOES_MUTUE</code>
    que estão com <code>ACTIVO = 1</code>, ordenados por <code>CODIGO</code>.<br><br>
    Os campos são retornados com as chaves em <strong>lowercase</strong> para facilitar o consumo no frontend.
  `,
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de parâmetros retornada com sucesso (pode ser array vazio)',
    type: [Object],
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno no servidor ao executar a consulta',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description:
      'Pesquisa parcial (ignorando maiúsculas/minúsculas) na descrição ou observação',
    example: 'pontual',
  })
  @RequiredPermissions(PermissionTypeDetails.PARAMETROS_GERAIS_AVALIACAO.sigla)
  async viewNote(@Query('search') search?: string) {
    return this.generalParametersForEvaluationService.viewNote(search);
  }

  @Get('parametros-avaliacoes-attendance-list')
  async attendanceListParams() {
    return this.generalParametersForEvaluationService.attendanceList();
  }

  @Get('lancamento/pauta')
  @ApiOperation({ summary: 'Filtrar pautas lançadas' })
  @ApiResponse({ status: 200, description: 'Lista ....' })
  @RequiredPermissions(PermissionTypeDetails.LANCAMENTO_PAUTA.sigla)
  findAll(@Query() filtro: FiltroLancamentoPautaDto) {
    return this.agendaLaunch.getAll(filtro);
  }
  @Get('lancamento/uc-sem-pauta')
  @ApiOperation({ summary: 'Filtrar pautas lançadas' })
  @ApiResponse({ status: 200, description: 'Lista ....' })
  @RequiredPermissions(PermissionTypeDetails.LANCAMENTO_PAUTA.sigla)
  getAllUcSemPauta(@Query() filtro: FiltroLancamentoPautaDto) {
    return this.agendaLaunch.getAllUcSemPauta(filtro);
  }

  @Get('estado-pauta')
  async estadoPauta() {
    return this.agendaLaunch.getPautaEstado();
  }

  @Post('lancamento/pauta/create')
  @RequiredPermissions(PermissionTypeDetails.LANCAMENTO_PAUTA.sigla)
  async create(@Body() createDto: CreateLancamentoPautaDto) {
    return this.agendaLaunch.create(createDto);
  }

  @Patch('lancamento-pauta/:id/estado')
  async atualizarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEstadoDto: UpdateEstadoPautaDto,
  ) {
    return this.agendaLaunch.updateEstado(id, updateEstadoDto);
  }

  @Get('filtrar')
  @ApiOperation({ summary: 'Filtrar alunos por critérios específicos' })
  @ApiResponse({ status: 200, description: 'Lista de alunos filtrados' })
  @RequiredPermissions(
    PermissionTypeDetails.LANCAMENTO_NOTAS_ANO_CORRENTE.sigla,
  )
  filtrarAlunos(@Query() filtro: StudentFiltersDto) {
    return this.noteReleaseService.findstudents(filtro);
  }

  @Put('parametros-avaliacoes-attendance-list/:codigo')
  @ApiOperation({
    summary: 'Atualiza um parâmetro de avaliação (attendance list)',
  })
  @ApiParam({
    name: 'codigo',
    description: 'Código identificador do parâmetro',
    example: 16,
  })
  @ApiResponse({ status: 200, description: 'Atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Registro não encontrado' })
  async update(
    @Param('codigo', ParseIntPipe) codigo: number,
    @Body() updateData: UpdateParametroAvaliacaoAttendanceListDto,
    @Req() req: any,
  ) {
    const user = req.user;
    return this.generalParametersForEvaluationService.updateAttendanceList(
      codigo,
      updateData,
      user,
    );
  }

  @Get('permissoes')
  @RequiredPermissions(
    PermissionTypeDetails.PERMISSAO_LANC_NOTA_FORA_PRAZO.sigla,
  )
  async findPermissionLaunch(
    @Query(ValidationPipe) params: PermissionAssessmentDTO,
  ) {
    return this.permissionService.findPermissionLaunch(params);
  }

  @Get('prompt-get-permission-launch')
  async getPromptPermissionLaunch(
    @Query(ValidationPipe) params: PromptGetPermissionLaunchDTO,
  ) {
    return this.permissionService.promptGetPermissionLaunch(params);
  }

  @Post('permissoes')
  @ApiOperation({
    summary: 'Criar Permissão de avaliação do aluno',
    description:
      'Faz um INSERT se na tabela de permissões de lançamento de nota caso estiver em um intervalo futuro',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissão da Avaliação criada ou atualizada com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos enviados.',
  })
  @RequiredPermissions(
    PermissionTypeDetails.PERMISSAO_LANC_NOTA_FORA_PRAZO.sigla,
  )
  async createPermissionAssessment(@Body() dto: CreatePermissionAssessmentDTO) {
    return await this.permissionService.createPermissionAssessment(dto);
  }

  @Get('disciplinas-prova')
  async buscarDisciplinasProva(
    @Query(ValidationPipe) params: BuscarDisciplinasProvaDto,
  ) {
    return this.service.buscarDisciplinasProva(params);
  }

  @Get('notas')
  @RequiredPermissions(PermissionTypeDetails.LANCAMENTO_NOTAS_AVALIACOES.sigla)
  async buscarNotas(
    @Query(ValidationPipe) params: BuscarNotasDto,
  ): Promise<NotaLancadaResponseDto[]> {
    return this.service.buscarNotas(params.turmaOuHorarioId, params);
  }

  @Get('estudantes-inscritos')
  @RequiredPermissions(
    PermissionTypeDetails.ESTUDANTES_INSCRITOS_POR_AVALIACAO.sigla,
  )
  async findAllStudentEnrolledAvaluation(
    @Query(ValidationPipe) params: StudentEnrolledByAssessmentDTO,
  ) {
    return this.studentAssessmentService.findAllStudentEnrolledAvaluation(
      params,
    );
  }

  @Get('unidades-curriculares')
  @ApiOperation({
    summary: 'Listar fórmulas de avaliação por curso, ano e semestre',
  })
  @RequiredPermissions(
    PermissionTypeDetails.DEFINIR_FORMULA_UNIDADE_CURRICULAR.sigla,
  )
  async listarUnidadesCurriculares(
    @Query(ValidationPipe) params: ListarUnidadesCurricularesDto,
  ) {
    return this.defineFormulaUcService.listarUnidadesCurriculares(params);
  }

  @Put('unidades-curriculares')
  @RequiredPermissions(
    PermissionTypeDetails.DEFINIR_FORMULA_UNIDADE_CURRICULAR.sigla,
  )
  async salvarFormula(@Body() body: AtualizarFormulaDto, @Req() req: any) {
    const UpdatedById = req.user.sub;
    const uc = await this.defineFormulaUcService.atualizarFormula(
      body,
      UpdatedById,
    );

    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    await AccessLogHelper.logAccess(this.httpService, {
      descricao: buildFormulaLog(req.user, body as any),
      fkAcesso: 7,
      fkFuncionalidade: 91,
      fkUtilizadorResponsavel: UpdatedById,
      fkOperacaoLog: 7,
      ip: ip,
    });
    return uc;
  }

  @Get('definir/oral')
  @ApiOperation({ summary: 'Listar disciplinas com status de oral habilitado' })
  @ApiResponse({ status: 200, type: [DefinirOralGradeDto] })
  @RequiredPermissions(
    PermissionTypeDetails.DEFINIR_FORMULA_UNIDADE_CURRICULAR.sigla,
  )
  async buscar(
    @Query(ValidationPipe) params: ListarDefinirOralDto,
  ): Promise<DefinirOralGradeDto[]> {
    return this.oralService.buscar(params);
  }

  @Patch('definir/oral/status')
  @ApiOperation({
    summary: 'Habilitar ou desabilitar prova oral para uma disciplina',
  })
  @ApiBody({ type: AtualizarStatusOralDto })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Disciplina não encontrada' })
  async atualizarStatus(
    @Body(ValidationPipe) dto: AtualizarStatusOralDto,
  ): Promise<{ message: string; habilitar: boolean }> {
    await this.oralService.atualizarStatus(dto);
    return {
      message: 'Status da oral atualizado com sucesso',
      habilitar: dto.habilitar,
    };
  }

  @Post('estatistica-avaliacao')
  @ApiOperation({ summary: 'Trazer todas estatisticas' })
  @ApiResponse({
    status: 201,
    description: 'Estatisticas trazidas com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @RequiredPermissions(PermissionTypeDetails.ESTATISTICA_NOTAS_LANCADAS.sigla)
  async buscarEstatisticaAvaliacao(
    @Body(ValidationPipe) dto: StatisticAssessmentDTO,
  ) {
    return this.statisticService.findStatisticAssessment(dto);
  }

  @Get('marcacoes-provas')
  async buscarProvasMarcadadaS(
    @Query(ValidationPipe) params: MarkingAssessmentDTO,
  ) {
    return this.markingAssessmentService.findMarkingAssementService(params);
  }

  @Put('permissoes/:permissionId')
  @ApiOperation({
    summary:
      'Atualizar permissão de edição de Lançamento de prova fora do prazo pelo ID da permissão',
  })
  updatePermissionToEditSchedule(
    @Param('permissionId', ValidationPipe) permissionId: number,
    @Body(ValidationPipe) query: UpdatePermissionEditScheduleDto,
  ) {
    return this.permissionService.updatePermissionAssessment(
      permissionId,
      query,
    );
  }

  @Get('visualizar-notas')
  async visualizarNots(@Query(ValidationPipe) params: FetchViewNotesDTO) {
    return this.viewNotesService.findNoteByHorario(params);
  }
}
