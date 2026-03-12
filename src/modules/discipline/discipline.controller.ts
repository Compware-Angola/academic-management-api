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

@ApiTags('DISCIPLINAS')
@Controller('discipline')
export class DisciplineController {
  constructor(private readonly disciplineService: DisciplineService) {}

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
  return this.disciplineService.updateDisciplina(codigo, dto,pkUtilizador);
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
}