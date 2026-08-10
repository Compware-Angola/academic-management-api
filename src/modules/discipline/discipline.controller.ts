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
import { CreateUnidadesCurricularesDto } from './dto/create-unidade-curricular.plano.dto';
import { CreateUnidadeCurricularDepartamentoDto } from './dto/create-unidade-curricular-departamento.dto';
import { FindUnidadeCurricularDeptDto } from './dto/find-unidade-curricular-dept.dto';
import { CreatePlanoGradeCurricularEmMassaDto } from './dto/create-plano-grade-curricular-em-massa.dto';
import { ConfigurationPlaneService } from './configuration-plane.service';
import { ToggleStatusGradeCurricularDto } from './dto/toggle-status-grade-curricular.dto';
import { FindGradeCurricularAdminDto } from './dto/find-grade-curricular-admin.dto';

@ApiTags('DISCIPLINAS')
@Controller('discipline')
export class DisciplineController {
  constructor(
    private readonly disciplineService: DisciplineService,
    private readonly configurationPlaneService: ConfigurationPlaneService,
  ) {}

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
    console.log('chegou aqui', query);
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
  @Delete('plano-curricular/:codigoGrade')
  @ApiOperation({
    summary: 'Remover UC do plano',
    description: 'Remove UC do plano curricular.',
  })
  @HttpCode(HttpStatus.OK)
  async removerUnidadeCurricularDoPlano(
    @Param('codigoGrade') codigoGrade: number,
  ) {
    return this.disciplineService.removerUnidadeCurricularDoPlano(codigoGrade);
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
}
