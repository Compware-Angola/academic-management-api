import { Controller, Get, Patch, Query, ValidationPipe } from '@nestjs/common';
import { AssiduidadeService } from './assiduidade.service';
import { FindAgendamentoAulaDto } from './dto/FindAgendamentoAulaDto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AtendanceControlling } from './dto/attendance-controlling.dto';
import { FindAttendanceTestDto } from './dto/FindAttendanceTestDto';
import { MarkAttendanceDto } from './dto/MarkAttendanceDto';
import { GeneralAttendanceCalendarDto } from './dto/GeneralAttendanceCalendarDto';
import { FindTeacherClassCalendarDto } from './dto/FindTeacherClassCalendarDto';
import { FindEstatisticaAssiduidadeDocenteDto } from './dto/FindEstatisticaAssiduidadeDocenteDto';

@ApiTags('ASSIDUIDADE')
@ApiBearerAuth()
@Controller('assiduidade')
export class AssiduidadeController {
  constructor(private readonly assiduidadeService: AssiduidadeService) {}

  @Get('filtro')
  @ApiOperation({
    summary: 'Consultar assiduidade por intervalo de datas (GET)',
    description: 'Retorna lista de agendamentos filtrados por docente, unidade curricular, estado, ano lectivo e semestre.',
  })
  @ApiResponse({ status: 200, description: 'Lista de agendamentos retornada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos.' })
  assiduidade(
    @Query(ValidationPipe) dto: FindAgendamentoAulaDto,
  ) {
    const utilizadorId = 163;
    return this.assiduidadeService.assiduidade(utilizadorId, dto);
  }

  @Get('campo')
  @ApiOperation({
    summary: 'Consultar assiduidade de campo (GET)',
    description: 'Retorna lista de agendamentos de campo filtrados por docente, unidade curricular, estado, ano lectivo e semestre.',
  })
  @ApiResponse({ status: 200, description: 'Lista de agendamentos de campo retornada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos.' })
  assiduidadeCampo(
    @Query(ValidationPipe) dto: FindAgendamentoAulaDto,
  ) {
    const utilizadorId = 163;
    return this.assiduidadeService.assiduidadeCampo( dto);
  }
  @Patch('marcar-aula')
  @ApiOperation({
    summary: 'Marcar assiduidade de aula (PATCH)',
    description: 'Marca a assiduidade de uma aula normal ou de campo.',
  })
  @ApiResponse({ status: 200, description: 'Assiduidade marcada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos.' })
  markAttendanceClass(
    @Query(ValidationPipe) dto: MarkAttendanceDto,
  ) {
  
    return this.assiduidadeService.markAttendance(dto);
  }

  @Get('prova')
  @ApiOperation({
    summary: 'Consultar assiduidade de provas (GET)',
    description: 'Retorna lista de provas com informações de assiduidade.',
  })
  @ApiResponse({ status: 200, description: 'Lista de provas retornada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos.' })
  assiduidadeProva(
    @Query(ValidationPipe) dto: FindAttendanceTestDto,
  ) {
    return this.assiduidadeService.assiduidadeProva(dto);
  }
  @Patch('marcar-prova')
  @ApiOperation({
    summary: 'Marcar assiduidade de prova (PATCH)',
    description: 'Marca a assiduidade de uma prova.',
  })
  @ApiResponse({ status: 200, description: 'Assiduidade de prova marcada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos.' })
  markAttendanceTest(
    @Query(ValidationPipe) dto: MarkAttendanceDto,
  ) {
  
    return this.assiduidadeService.markAttendanceTest(dto);
  }

  @Get('status-agendamento')
  @ApiOperation({
    summary: 'Obter todos os status de agendamento',
    description: 'Retorna uma lista com todos os status disponíveis para agendamentos.',
  })
  @ApiResponse({ status: 200, description: 'Status de agendamento retornados com sucesso.' })
  getAllStatusAgendamento() {
    return this.assiduidadeService.getAllStatusAgendamento();
  }

  @Get('controle')
  @ApiOperation({
    summary: 'Consultar controle de assiduidade por Ano Lectivo,Estado da Aula,Semestre,Docente,Data Inicio,Data Fim',
    description: 'Retorna lista de controle de assiduidade filtrados por docente, unidade curricular, ano lectivo e semestre.',
  })
  @ApiResponse({ status: 200, description: 'Lista de controle de assiduidade retornada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos.' })
  assiduidadeControle(@Query(ValidationPipe) dto: AtendanceControlling){
    const utilizadorId = 163;
    return this.assiduidadeService.attendanceControlling(dto);
  }

  @Get('estado-aula')
  @ApiOperation({
    summary: 'Lista estados da aula',
    description: 'Retorna lista de estados da aula, para o controle de assiduidade.',
  })
  @ApiResponse({ status: 200, description: 'Lista de controle de assiduidade retornada com sucesso.' })
  assiduidadeEstadoAula(){
    return this.assiduidadeService.getStateLessonAttendance();
}

@Get('controle-geral-docente')
@ApiOperation({
  summary: 'Controle geral de assiduidade por docente (calendário)',
  description: 'Calendário MÊS/SEMANA/DIA baseado em docenteId (preferível) ou docenteNome (legado).',
})
@ApiResponse({ status: 200, description: 'Dados retornados com sucesso.' })
@ApiResponse({ status: 400, description: 'Parâmetros inválidos.' })
controleGeralPorDocente(@Query(ValidationPipe) dto: GeneralAttendanceCalendarDto) {
  return this.assiduidadeService.generalAttendanceByDocenteCalendar(dto);
}

@Get('calendario-docente')
@ApiOperation({
  summary: 'Consultar calendário de aulas do docente',
  description: 'Retorna os agendamentos reais de aulas do docente em formato de calendário.',
})
@ApiResponse({ status: 200, description: 'Calendário do docente retornado com sucesso.' })
@ApiResponse({ status: 400, description: 'Parâmetros inválidos.' })
teacherClassCalendar(
  @Query(ValidationPipe) dto: FindTeacherClassCalendarDto,
) {
  return this.assiduidadeService.teacherClassCalendar(dto);
}


@Get('estatistica-assiduidade-docente')
async getEstatisticaAssiduidadeDocente(
  @Query() dto: FindEstatisticaAssiduidadeDocenteDto,
) {
  return this.assiduidadeService.getEstatisticaAssiduidadeDocente(dto);
}
}