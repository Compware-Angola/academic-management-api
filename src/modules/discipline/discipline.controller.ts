import {
  Controller,
  Get,
  ValidationPipe,
  Query,
  Req,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { DisciplineService } from './discipline.service';

import { ApiOperation, ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';

import { FindDisciplinaAlunoDTO } from './dto/find-disciplina-aluno.dto';
import { FindDisciplinasDto } from './dto/find-disciplinas.dto';
import { CreateDisciplinaDto } from './dto/create-discipline.dto';
import { UpdateDisciplinaDto } from './dto/update-discipline.dto';
import { FindGradeCurricularDto } from './dto/FindGradeCurricularDto';
import { CreateUnidadeCurricularDto } from './dto/create-unidade-curricular.plano.dto';
import { CreateUnidadeCurricularDepartamentoDto } from './dto/create-unidade-curricular-departamento.dto';
import { FindUnidadeCurricularDeptDto } from './dto/find-unidade-curricular-dept.dto';
import { CreatePlanoGradeCurricularEmMassaDto } from './dto/create-plano-grade-curricular-em-massa.dto';
import { ConfigurationPlaneService } from './configuration-plane.service';
import { ToggleStatusGradeCurricularDto } from './dto/toggle-status-grade-curricular.dto';
import { FindGradeCurricularAdminDto } from './dto/find-grade-curricular-admin.dto';
import { CreateUCTroncoComumPlanoCursoDto } from './dto/create-uc-tronco-comum-plano-curso.dto';
import { CreateUnidadesCurricularesDto } from './dto/add-uc-to-plan.dto';
import { ConsultarVinculacaoGradeDto } from './dto/ConsultarVinculacaoGradeDto';
import { RemoveUnidadeCurricularDto } from './dto/RemoveUnidadeCurricularDto';
import { UpdatePlanoGradeExtrasDto } from './dto/update-plano-grade-extras.dto';


@ApiTags('DISCIPLINAS')
@Controller('discipline')
export class DisciplineController {
  constructor(
    private readonly disciplineService: DisciplineService,
    private readonly configurationPlaneService: ConfigurationPlaneService,
  ) { }

  @Post()
  @ApiOperation({
    summary: 'Criar Disciplina',
    description:
      'Endpoint responsável por criar uma nova disciplina no sistema.',
  })
  @ApiBody({ type: CreateDisciplinaDto })
  @ApiResponse({
    status: 201,
    description: 'Disciplina criada com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Erro de validação nos dados enviados',
  })
  async createDisciplina(@Body() dto: CreateDisciplinaDto) {
    const pkUtilizador = 1;
    return this.disciplineService.createDisciplina(dto, pkUtilizador);
  }

  @Post('plano-curricular/lote')
  @ApiOperation({
    summary: 'adicionar múltiplas UC ao plano',
    description: 'Adiciona uma ou mais UC ao plano curricular do curso.',
  })
  @HttpCode(HttpStatus.CREATED)
  async adicionarUnidadesCurricularesNoPlano(
    @Body() dto: CreateUnidadesCurricularesDto,
  ) {
    const codigoUtilizador = 1;
    return this.disciplineService.adicionarUnidadesCurricularesNoPlano(
      dto,
      codigoUtilizador,
    );
  }
  @Post('add-grade-curricular-plano-massa')
  @ApiBody({ type: CreatePlanoGradeCurricularEmMassaDto })
  @ApiResponse({
    status: 201,
    description: 'Grades curriculares adicionadas ao plano com sucesso.',
  })
  async adicionarGradeCurricularNoPlanoEmMassa(
    @Body() dto: CreatePlanoGradeCurricularEmMassaDto,
  ) {
    const codigoUtilizador = 1;
    return this.configurationPlaneService.createConfigurationPlano(
      dto,
      codigoUtilizador,
    );
  }
  @Patch(':codigo')
  async updateDisciplina(
    @Param('codigo', ParseIntPipe) codigo: number,
    @Body() dto: UpdateDisciplinaDto,
  ) {
    const pkUtilizador = 1;
    return this.disciplineService.updateDisciplina(codigo, dto, pkUtilizador);
  }
  @Get()
  @ApiOperation({
    summary: 'Listar disciplinas matriculadas do aluno',
    description:
      'Retorna as disciplinas que o aluno está matriculado com base nos filtros enviados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de disciplinas do aluno retornada com sucesso',
  })
  findGradeCurricularAluno(
    @Query(ValidationPipe) query: FindDisciplinaAlunoDTO,
    @Req() req: any,
  ) {
    return this.disciplineService.findGradeCurricularAluno(query);
  }

  @Get('all')
  @ApiOperation({
    summary: 'Listar todas as disciplinas',
    description: 'Retorna todas as disciplinas cadastradas no sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de disciplinas retornada com sucesso',
  })
  async findDisciplinas(@Query() dto: FindDisciplinasDto) {
    return this.disciplineService.findDisciplinas(dto);
  }

  @Get('grade-curricular')
  @ApiOperation({
    summary: 'Listar  UC no plano',
    description: 'Retorna lista dos uc.',
  })
  async findGradeCurricular(@Query() dto: FindGradeCurricularDto) {
    return this.disciplineService.findGradeCurricular(dto);
  }

  @Get('grade-curricular2')
  @ApiOperation({
    summary: 'Listar  UC no plano',
    description: 'Retorna lista dos uc.',
  })
  async findGradeCurricular2(@Query() dto: FindGradeCurricularAdminDto) {
    return this.disciplineService.findAllGradeCurricular(dto);
  }

  @Patch('grade-curricular/:codigo/status')
  toggleStatusGradeCurricular(
    @Param('codigo', ParseIntPipe) codigo: number,
    @Body() dto: ToggleStatusGradeCurricularDto,
  ) {
    return this.disciplineService.toggleStatusGradeCurricular(
      codigo,
      dto.status,
    );
  }

  @Patch('plano-curricular-grade/:codigo')
  @ApiOperation({
    summary: 'Activar/desactivar Oral e Prática da UC no plano',
    description:
      'Actualiza TEM_ORAL e/ou TEM_PRATICA para a linha do plano curricular indicada.',
  })
  async atualizarTemOralTemPratica(
    @Param('codigo', ParseIntPipe) codigo: number,
    @Body() dto: UpdatePlanoGradeExtrasDto,
  ) {
    const codigoUtilizador = 1;
    return this.disciplineService.atualizarTemOralTemPratica(
      codigo,
      dto,
      codigoUtilizador,
    );
  }

  @Post('plano-curricular')
  @ApiOperation({
    summary: 'add uc no plano',
    description: 'Adiciona UC ao plano.',
  })
  @HttpCode(HttpStatus.CREATED)
  async adicionarUnidadeCurricularNoPlano(
    @Body() dto: CreateUnidadeCurricularDto,
  ) {
    const codigoUtilizador = 1;
    return this.disciplineService.adicionarUnidadeCurricularNoPlano(
      dto,
      codigoUtilizador,
    );
  }
  @Delete('plano-curricular')
  @ApiOperation({
    summary: 'Remover UC do plano',
    description: 'Remove UC do plano curricular.',
  })
  @HttpCode(HttpStatus.OK)
  async removerUnidadeCurricularDoPlano(@Query() query: RemoveUnidadeCurricularDto) {
    const codigoUtilizador = 1;
    return this.disciplineService.removerUnidadeCurricularDoPlano(
      query,
      codigoUtilizador,
    );
  }

  @Delete('plano-curricular/desvincular/:codigoVinculo')
  @ApiOperation({
    summary: 'Desvincular UC do plano',
    description: 'Remove a vinculação entre UC e plano curricular (sem remover estudantes).',
  })
  @HttpCode(HttpStatus.OK)
  async desvincularUnidadeCurricular(@Param('codigoVinculo', ParseIntPipe) codigoVinculo: number) {
    const codigoUtilizador = 1;
    return this.disciplineService.desvincularUnidadeCurricularDoPlano(
      codigoVinculo,
      codigoUtilizador,
    );
  }

  @Post('departamento')
  @ApiOperation({
    summary: 'add uc no Departamento',
    description: 'Adiciona UC ao departamento.',
  })
  @HttpCode(HttpStatus.CREATED)
  async adicionarUnidadeCurricularNoDepartamento(
    @Body() dto: CreateUnidadeCurricularDepartamentoDto,
  ) {
    return this.disciplineService.adicionarUnidadeCurricularNoDepartamento(dto);
  }

  @Post('tronco-comum')
  @ApiOperation({
    summary: 'add uc no tronco comum',
    description: 'Adiciona UC ao tronco comum.',
  })
  @HttpCode(HttpStatus.CREATED)
  async adicionarUnidadeCurricularNoTroncoComum(
    @Body() dto: CreateUCTroncoComumPlanoCursoDto,
  ) {
    const codigoUtilizador = 1;
    return this.disciplineService.adicionarUcDoDepartamentoParaPlanoCurso(
      dto,
      codigoUtilizador,
    );
  }
  @Get('departamento')
  @ApiOperation({
    summary: 'Listar  UC no departamento',
    description: 'Retorna lista de uc no departamento.',
  })
  async listarUnidadeCurricularDept(
    @Query() dto: FindUnidadeCurricularDeptDto,
  ) {
    return this.disciplineService.listarUnidadeCurricularDept(dto);
  }

  @Get('vincular/consultar')
  async consultarVinculacao(@Query() dto: ConsultarVinculacaoGradeDto) {
    return this.disciplineService.consultarCursosVinculadosGrade(dto);
  }
}
