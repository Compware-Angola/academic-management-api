import { Controller, Get, Post, Body, Patch, Param, Delete, ValidationPipe, Query, Put, ParseIntPipe } from '@nestjs/common';
import { AssessmentService, NotaLancadaResponseDto } from './assessment.service';


import { BuscarNotasDto } from './dto/buscar-notas.dto';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
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
import { StudentEvaluationDto } from './dto/student-evaluation.dto';
import { HistoryNoteReleaseService } from './history_note_release.service';
import { FilterCurriculumGradeAlunoDto } from './dto/filter-student-curriculum.dto';
import { HistoryNoteReleaseDto } from './dto/history_note_release.dto';
import { GeneralParametersForEvaluationService } from './general_parameters_for_evaluation.service';
import { CreateParametroAvaliacaoMutueDto, UpdateParametroAvaliacaoMutueDto } from './dto/parametros-avaliacoes.dto';
import { UpdateParametroAvaliacaoAttendanceListDto } from './dto/update-parametro-avaliacao-attendance-list.dto';
import { FiltroLancamentoPautaDto } from './dto/filtro-lancamento-pauta.dto';
import { AgendaLaunchService } from './agenda_launch.service';
import { CreateLancamentoPautaDto } from './dto/create-lancamento-pauta.dto';

@Controller('assessment')
export class AssessmentController {
  constructor( private readonly agendaLaunch:AgendaLaunchService, private readonly generalParametersForEvaluationService:GeneralParametersForEvaluationService, private readonly historyNoteReleaseService:HistoryNoteReleaseService, private readonly noteReleaseService:NoteReleaseService,private readonly service: AssessmentService,private readonly defineFormulaUcService:DefineFormulaUcService,private readonly oralService:DefineFormulaUcOralService) {}
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
  async upsertEvaluation(@Body() dto: StudentEvaluationDto) {
    return await this.noteReleaseService.upsertStudentEvaluation(dto);
  }
  @Post('parametros-avaliacoes')
@ApiOperation({ summary: 'Cria um novo parâmetro de avaliação MUTUE' })
@ApiResponse({ status: 201, description: 'Parâmetro criado com sucesso' })
@ApiResponse({ status: 400, description: 'Dados inválidos' })
async createParametro(@Body(ValidationPipe) dto: CreateParametroAvaliacaoMutueDto) {
  return this.generalParametersForEvaluationService.createParametro(dto);
}

@Put('parametros-avaliacoes/:parametroId')
@ApiOperation({ summary: 'Atualiza um parâmetro de avaliação MUTUE existente' })
@ApiResponse({ status: 200, description: 'Parâmetro atualizado com sucesso' })
@ApiResponse({ status: 404, description: 'Parâmetro não encontrado' })
@ApiResponse({ status: 400, description: 'Dados inválidos' })
async updateParametro(  @Param('parametroId', ValidationPipe) parametroId: number,@Body(ValidationPipe) dto: UpdateParametroAvaliacaoMutueDto) {
  return this.generalParametersForEvaluationService.updateParametro(dto,parametroId);
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
async historyNoteRelease(@Query() params: HistoryNoteReleaseDto) {
  return this.historyNoteReleaseService.historyNoteRelease(params);
}
@Get('parametros-avaliacoes')
@ApiOperation({
  summary: 'Lista os parâmetros de avaliações  ativos',
  description: `
    Retorna todos os registros da tabela <code>FK2_TB_PARAMETROS_AVALIACOES_MUTUE</code> 
    que estão com <code>ACTIVO = 1</code>, ordenados por <code>CODIGO</code>.<br><br>
    Os campos são retornados com as chaves em <strong>lowercase</strong> para facilitar o consumo no frontend.
  `,
})
@ApiResponse({
  status: 200,
  description: 'Lista de parâmetros retornada com sucesso (pode ser array vazio)',
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
  description: 'Pesquisa parcial (ignorando maiúsculas/minúsculas) na descrição ou observação',
  example: 'pontual',
})
  async viewNote(@Query('search') search?: string) {
    return this.generalParametersForEvaluationService.viewNote(search);
  }
  @Get('parametros-avaliacoes-attendance-list')
  async(){
    return this.generalParametersForEvaluationService.attendanceList()
  }
@Get("lancamento/pauta")
@ApiOperation({ summary: 'Filtrar pautas lançadas' })
@ApiResponse({ status: 200, description: 'Lista ....' })
findAll(@Query() filtro: FiltroLancamentoPautaDto) {
  return this.agendaLaunch.getAll(filtro);
}
@Post("lancamento/pauta/create")
  async create(@Body() createDto: CreateLancamentoPautaDto) {
    return this.agendaLaunch.create(createDto);
  }


 @Get('filtrar')
@ApiOperation({ summary: 'Filtrar alunos por critérios específicos' })
@ApiResponse({ status: 200, description: 'Lista de alunos filtrados' })
filtrarAlunos(@Query() filtro: StudentFiltersDto) {
  return this.noteReleaseService.findstudents(filtro);
}
@Put('parametros-avaliacoes-attendance-list/:codigo')
@ApiOperation({ summary: 'Atualiza um parâmetro de avaliação (attendance list)' })
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
) {
  return this.generalParametersForEvaluationService.updateAttendanceList(codigo, updateData);
}

  @Get('disciplinas-prova')
  async buscarDisciplinasProva(
    @Query(ValidationPipe) params: BuscarDisciplinasProvaDto,
  ) {
    return this.service.buscarDisciplinasProva(params);
  }

@Get('notas')
  async buscarNotas(
    @Query(ValidationPipe) params: BuscarNotasDto,
  ): Promise<NotaLancadaResponseDto[]> {
    return this.service.buscarNotas(params.turmaOuHorarioId, params);
  }
  @Get('unidades-curriculares')
@ApiOperation({ summary: 'Listar fórmulas de avaliação por curso, ano e semestre' })
async listarUnidadesCurriculares(
  @Query(ValidationPipe) params: ListarUnidadesCurricularesDto,
) {
  return this.defineFormulaUcService.listarUnidadesCurriculares(params);
}
@Put('unidades-curriculares') // ou @Put
async salvarFormula(@Body() body: AtualizarFormulaDto) {
  return this.defineFormulaUcService.atualizarFormula(body);
}
@Get('definir/oral')
  @ApiOperation({ summary: 'Listar disciplinas com status de oral habilitado' })
  @ApiResponse({ status: 200, type: [DefinirOralGradeDto] })
  async buscar(
    @Query(ValidationPipe) params: ListarDefinirOralDto,
  ): Promise<DefinirOralGradeDto[]> {
    return this.oralService.buscar(params);
  }
  @Patch('definir/oral/status')
@ApiOperation({ summary: 'Habilitar ou desabilitar prova oral para uma disciplina' })
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
}
