import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CursosService } from './cursos.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('cursos')
@Controller('cursos')
export class CursosController {
  constructor(private readonly cursosService: CursosService) {}

  @Get('especialidades/:codigoMatricula')
  especialidadesPorCurso(
    @Param('codigoMatricula', ParseIntPipe) codigoMatricula: number,
  ) {
    return this.cursosService.buscarEspecialidadesPorMatricula(codigoMatricula);
  }
}
