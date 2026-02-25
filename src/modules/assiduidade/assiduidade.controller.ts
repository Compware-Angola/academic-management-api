import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { AssiduidadeService } from './assiduidade.service';
import { FindAgendamentoAulaDto } from './dto/FindAgendamentoAulaDto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

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
}