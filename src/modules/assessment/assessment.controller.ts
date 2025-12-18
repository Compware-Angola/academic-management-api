import { Controller, Get, Post, Body, Patch, Param, Delete, ValidationPipe, Query, Put } from '@nestjs/common';
import { AssessmentService, NotaLancadaResponseDto } from './assessment.service';


import { BuscarNotasDto } from './dto/buscar-notas.dto';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
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

@Controller('assessment')
export class AssessmentController {
  constructor( private readonly historyNoteReleaseService:HistoryNoteReleaseService, private readonly noteReleaseService:NoteReleaseService,private readonly service: AssessmentService,private readonly defineFormulaUcService:DefineFormulaUcService,private readonly oralService:DefineFormulaUcOralService) {}
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

 @Get('filtrar')
@ApiOperation({ summary: 'Filtrar alunos por critérios específicos' })
@ApiResponse({ status: 200, description: 'Lista de alunos filtrados' })
filtrarAlunos(@Query() filtro: StudentFiltersDto) {
  return this.noteReleaseService.findstudents(filtro);
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
