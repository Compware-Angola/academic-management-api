import { Controller, Get, Patch, Query, ValidationPipe } from '@nestjs/common';
import { AssiduidadeService } from './assiduidade.service';
import { FindAgendamentoAulaDto } from './dto/FindAgendamentoAulaDto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FindAttendanceTestDto } from './dto/FindAttendanceTestDto';
import { MarkAttendanceDto } from './dto/MarkAttendanceDto';

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
}