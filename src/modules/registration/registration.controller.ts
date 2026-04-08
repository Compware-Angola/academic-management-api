import {
  Controller,
  Get,
  Injectable,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegistrationService } from './registration.service';
import { FindInscricaoSemUCDTO } from './dto/find-inscricao-sem-ucDTO';
import { FindEstudanteMatriculadoDTO } from './dto/find-studantes-matriculadoDTO';
import { FindEstudantesSemInscricaoCursoDTO } from './dto/find-estudantes-sem-Inscricao-cursoDTO';

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
}
