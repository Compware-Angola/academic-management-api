import {
  Controller,
  Get,
  Injectable,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegistrationService } from './registration.service';

import { FilterListagemGeralEstudantesDto } from './dto/filter-listagem-geral-de-estudantes.dto';
import { FilterInscritosPorUcDto } from './dto/filtrar-inscritos-por-uc.dto';
import { FilterHorariosInscritosPorUcDto } from './dto/filter-horarios-inscritos-por-uc';

import { FindInscricaoSemUCDTO } from './dto/find-inscricao-sem-ucDTO';
import { FindEstudanteMatriculadoDTO } from './dto/find-studantes-matriculadoDTO';
import { FindEstudantesSemInscricaoCursoDTO } from './dto/find-estudantes-sem-Inscricao-cursoDTO';
import { FilterEstadoMatriculaHorarioDto } from './dto/listar-estado-matricula-por-horario.dto';

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
  @Get('/estudantes/sem-inscricoes-curso')
  @ApiOperation({ summary: 'Lista Estudantes Sem Inscrições no Curso' })
  @ApiResponse({
    status: 200,
    description: 'Lista Estudantes Sem Inscrições no Curso',
    type: FindEstudantesSemInscricaoCursoDTO,
  })
  findEstudantesSemInscricoesNoCurso(
    @Query(ValidationPipe) query: FindEstudantesSemInscricaoCursoDTO,
  ) {
    return this.registrationService.findEstudantesSemInscricaoCurso(query);
  }

@Get('estado-matricula-horario')
@ApiOperation({ summary: 'Listar estado da matrícula do estudante por horário' })
@ApiResponse({ status: 200 })
async listarEstadoMatriculaPorHorario(
  @Query() filter: FilterEstadoMatriculaHorarioDto,
) {
  return this.registrationService.listarEstadoMatriculaPorHorario(filter);
}

}
