import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, ValidationPipe } from '@nestjs/common';
import { DocentesService } from './docentes.service';
import { CreateProgramaUCDTO, FindProgramaUCDTO } from './dto/find-programa-uc.dto';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CursosResponseDto } from './dto/curso';
import { CadeirasResponseDto } from './dto/cadeira';
import { FindTeacherWeeklyScheduleDto } from './dto/FindTeacherWeeklyScheduleDto';

@Controller('docentes')
export class DocentesController {
  constructor(private readonly docentesService: DocentesService) {}

  @Get('/programa-uc')
  findProgramaUC(
    @Query(ValidationPipe) query: FindProgramaUCDTO,
    @Req() req: any,
  ) {
    return this.docentesService.findProgramaUC(query);
  }
  @Get('/programas-sem-ucs')
  findProgramaSemUC(
    @Query(ValidationPipe) query: FindProgramaUCDTO,
    @Req() req: any,
  ) {
    return this.docentesService.findSemProgramaUC(query);
  }
@Get(':docenteId/cursos')
@ApiOperation({ summary: 'Lista cursos do docente' })
@ApiParam({
  name: 'docenteId',
  type: String,
  example: '486',
})
@ApiResponse({
  status: 200,
  description: 'Lista de cursos do docente',
  type: CursosResponseDto,
})
findCursos(
  @Param('docenteId', ParseIntPipe) docenteId: string,
) {
  return this.docentesService.findCursos(docenteId);
}
@Get(':docenteId/:cursoId/:classeId/cadeiras')
@ApiOperation({ summary: 'Lista cadeiras do docente por curso' })
@ApiParam({
  name: 'docenteId',
  type: String,
  example: '486',
})
@ApiParam({
  name: 'cursoId',
  type: String,
  example: '11',
})
@ApiParam({
  name: 'classeId',
  type: String,
  example: '2',
})
@ApiResponse({
  status: 200,
  description: 'Lista de cadeiras do docente no curso',
  type: CadeirasResponseDto,
})
findCadeiras(
  @Param('docenteId', ParseIntPipe) docenteId: string,
  @Param('cursoId', ParseIntPipe) cursoId: string,
  @Param('classeId', ParseIntPipe) classeId: string,
) {
  return this.docentesService.findCadeiras({ docenteId, cursoId, classeId });
}
@Post('/programa-uc')
@ApiOperation({ summary: 'Cria um programa UC' })
@ApiBody({ type: CreateProgramaUCDTO })
@ApiResponse({
  status: 200,
  description: 'Programa UC criado com sucesso',
})
async createProgramaUC(
  @Body(ValidationPipe) body: CreateProgramaUCDTO,
) {
  return this.docentesService.createProgramaUC(body);
}

@Get('horario-docente')
@ApiOperation({
  summary: 'Consultar horário semanal do docente',
  description: 'Retorna o horário semanal estrutural do docente filtrado por ano lectivo, semestre e período.',
})
@ApiResponse({ status: 200, description: 'Horário semanal retornado com sucesso.' })
@ApiResponse({ status: 400, description: 'Parâmetros inválidos.' })
teacherWeeklySchedule(
  @Query(ValidationPipe) dto: FindTeacherWeeklyScheduleDto,
) {
  return this.docentesService.teacherWeeklySchedule(dto);
}

}