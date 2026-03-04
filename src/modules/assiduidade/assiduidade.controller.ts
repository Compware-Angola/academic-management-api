import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { AssiduidadeService } from './assiduidade.service';
import { FindAgendamentoAulaDto } from './dto/FindAgendamentoAulaDto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AtendanceControlling } from './dto/attendance-controlling.dto';

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
  assiduidadeCampo() {
    return this.assiduidadeService.assiduidadeCampo();
  }

  @Get('prova')
  assiduidadeProva() {
    return this.assiduidadeService.assiduidadeProva();
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
}