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

@Get('estudantes-por-estado-matricula')
@ApiOperation({ summary: 'Listar estudantes por estado da matrícula' })
@ApiResponse({ status: 200 })
async listarEstudantesPorEstadoMatricula(
  @Query() filter: FilterListarEstudantesPorEstadoMatriculaDto,
) {
  return this.registrationService.listarEstudantesPorEstadoMatricula(filter);
}

@Get('colisoes-isentas/matriculas')
@ApiOperation({ summary: 'Listar isenções de colisão por matrícula' })
@ApiResponse({ status: 200 })
async listarColisoesIsentasPorMatricula(
  @Query() filter: FilterListarColisoesIsentasPorMatriculaDto,
) {
  return this.registrationService.listarColisoesIsentasPorMatricula(filter);
}

@Get('colisoes-isentas/cursos')
@ApiOperation({ summary: 'Listar isenções de colisão por curso' })
@ApiResponse({ status: 200 })
async listarColisoesIsentasPorCurso(
  @Query() filter: FilterListarColisoesIsentasPorCursoDto,
) {
  return this.registrationService.listarColisoesIsentasPorCurso(filter);
}

@Get('pesquisar-estudantes-isencao')
@ApiOperation({ summary: 'Pesquisar estudantes para isenção de colisão' })
@ApiResponse({ status: 200 })
async pesquisarEstudantesParaIsencao(
  @Query() filter: FilterPesquisarEstudantesIsencaoDto,
) {
  return this.registrationService.pesquisarEstudantesParaIsencao(filter);
}

@Post('colisoes/matricula')
@ApiOperation({ summary: 'Isentar colisão por matrícula' })
@ApiResponse({ status: 201 })
async isentarColisaoMatricula(
  @Body() body: IsentarColisaoMatriculaDto,
  @Req() req: any,
) {
  
  return this.registrationService.isentarColisaoMatricula(
    body.matricula,
    body.anoLectivo,
    req.user
  );
}

@Post('colisoes/curso')
@ApiOperation({ summary: 'Isentar colisão por curso' })
@ApiResponse({ status: 201 })
async isentarColisaoCurso(
  @Body() body: IsentarColisaoCursoDto,
  @Req() req: any,
) {
  return this.registrationService.isentarColisaoCurso(
    body.curso,
    body.turno,
    body.anoLectivo,
    req.user,
  );
}


/** Buscar estudante por número de matrícula. */
@Get('estudante')
@ApiOperation({ summary: 'Pesquisar estudante por número de matrícula' })
@ApiResponse({ status: 200 })
async findEstudantePorMatricula(@Query('matricula') matricula: number) {
  return this.registrationService.findEstudantePorMatricula(Number(matricula));
}

/** Verificar se já existe isenção de colisão por matrícula. */
@Get('colisoes/matricula/existe')
@ApiOperation({ summary: 'Verificar colisão por matrícula' })
@ApiResponse({ status: 200 })
async verificarColisaoMatricula(
  @Query('matricula') matricula: number,
  @Query('anoLectivo') anoLectivo: number,
) {
  return this.registrationService.verificarColisaoMatricula(
    Number(matricula),
    Number(anoLectivo),
  );
}

/** Verificar se já existe isenção de colisão por curso. */
@Get('colisoes/curso/existe')
@ApiOperation({ summary: 'Verificar colisão por curso' })
@ApiResponse({ status: 200 })
async verificarColisaoCurso(
  @Query('curso') curso: number,
  @Query('anoLectivo') anoLectivo: number,
) {
  return this.registrationService.verificarColisaoCurso(
    Number(curso),
    Number(anoLectivo),
  );
}


}
