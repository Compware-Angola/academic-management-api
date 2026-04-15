import {
  Body,
  Controller,
  Get,
  Injectable,
  Post,
  Query,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegistrationService } from './registration.service';





import { FilterHorariosInscritosPorUcDto } from './dto/filter-horarios-inscritos-por-uc';


import { FindEstudanteMatriculadoDTO } from './dto/find-studantes-matriculadoDTO';
import { FindEstudantesSemInscricaoCursoDTO } from './dto/find-estudantes-sem-Inscricao-cursoDTO';
import { FilterEstadoMatriculaHorarioDto } from './dto/listar-estado-matricula-por-horario.dto';
import { FilterListarEstudantesPorEstadoMatriculaDto } from './dto/filter-listar-estudantes-por-estado-da-matricula.dto';
import { IsentarColisaoMatriculaDto } from './dto/isentar-colisao-matricula.dto';
import { IsentarColisaoCursoDto } from './dto/isentar-colisao-curso.dto';
import { FilterPesquisarEstudantesIsencaoDto } from './dto/filter-pesquisar-estudante-isentar-colisao.dto';
import { FilterListarColisoesIsentasPorMatriculaDto } from './dto/filter-listar-colisoes-isentas-por-matriculas.dto';
import { FilterListarColisoesIsentasPorCursoDto } from './dto/filter-listar-colisoes-isentas-por-curso';


import { FilterListagemGeralEstudantesDto } from './dto/filter-listagem-geral-de-estudantes.dto';
import { FilterInscritosPorUcDto } from './dto/filtrar-inscritos-por-uc.dto';
import { FindInscricaoSemUCDTO } from './dto/find-inscricao-sem-ucDTO';






@ApiTags('registration')
@Controller('registration')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}
  @Get('/incricao-sem-uc')
  @ApiOperation({ summary: 'Lista cadeiras do docente por curso' })
  @ApiResponse({
    status: 200,
    description: 'Lista de cadeiras do docente no curso',
    type: FindInscricaoSemUCDTO,
  })
  findInscricaoSemUc(@Query(ValidationPipe) query: FindInscricaoSemUCDTO) {
    return this.registrationService.findInscricaoSemUC(query);
  }

  @Get('listagem-geral-estudantes')
  @ApiOperation({ summary: 'Listagem geral de estudantes' })
  @ApiResponse({ status: 200 })
  async listarGeralEstudantes(
    @Query() filter: FilterListagemGeralEstudantesDto,
  ) {
    return this.registrationService.listarGeralEstudantes(filter);
  }  

@Get('inscritos-por-uc')
@ApiOperation({ summary: 'Listar inscritos por unidade curricular' })
@ApiResponse({ status: 200 })
async listarInscritosPorUc(@Query() filter: FilterInscritosPorUcDto) {
  return this.registrationService.listarInscritosPorUc(filter);
}

@Get('horarios-disponiveis-inscritos-por-uc')
@ApiOperation({
  summary: 'Listar horários realmente disponíveis nas inscrições por UC',
})
@ApiResponse({ status: 200 })
async listarHorariosDisponiveisInscritosPorUc(
  @Query() filter: FilterHorariosInscritosPorUcDto,
) {
  return this.registrationService.listarHorariosDisponiveisInscritosPorUc(filter);
}

  @Get('/estudantes-matriculados')
  @ApiOperation({ summary: 'Lista Estudantes Matriculados' })
  @ApiResponse({
    status: 200,
    description: 'Lista de cadeiras do docente no curso',
    type: FindEstudanteMatriculadoDTO,
  })
  findEstudantesMatriculados(
    @Query(ValidationPipe) query: FindEstudanteMatriculadoDTO,
  ) {
    return this.registrationService.findEstudantesMatriculados(query);
  }
}
