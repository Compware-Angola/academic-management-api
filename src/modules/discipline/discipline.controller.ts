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

import {
  ApiOperation,
  ApiTags,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';

import { FindDisciplinaAlunoDTO } from './dto/find-disciplina-aluno.dto';
import { FindDisciplinasDto } from './dto/find-disciplinas.dto';
import { CreateDisciplinaDto } from './dto/create-discipline.dto';
import { UpdateDisciplinaDto } from './dto/update-discipline.dto';
import { FindGradeCurricularDto } from './dto/FindGradeCurricularDto';
import { CreateUnidadeCurricularDto } from './dto/create-unidade-curricular.plano.dto';
import { CreateUnidadeCurricularDepartamentoDto } from './dto/create-unidade-curricular-departamento.dto';
import { FindUnidadeCurricularDeptDto } from './dto/find-unidade-curricular-dept.dto';

@ApiTags('DISCIPLINAS')
@Controller('discipline')
export class DisciplineController {
  constructor(private readonly disciplineService: DisciplineService) { }

  @Post()
  @ApiOperation({
    summary: 'Criar Disciplina',
    description: 'Endpoint responsável por criar uma nova disciplina no sistema.',
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
  @Post('plano-curricular')
  @ApiOperation({
    summary: 'add uc no plano',
    description: 'Adiciona UC ao plano.',
  })
  @HttpCode(HttpStatus.CREATED)
  async adicionarUnidadeCurricularNoPlano(
    @Body() dto: CreateUnidadeCurricularDto,
  ) {
    const codigoUtilizador = 1
    return this.disciplineService.adicionarUnidadeCurricularNoPlano(dto, codigoUtilizador);
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
  async listarUnidadeCurricularDept(@Query() dto: FindUnidadeCurricularDeptDto) {
    return this.disciplineService.listarUnidadeCurricularDept(dto);
  }
}