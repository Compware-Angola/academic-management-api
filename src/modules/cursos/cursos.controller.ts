import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CursosService } from './cursos.service';
import { ApiTags } from '@nestjs/swagger';
import { Curso, CursoParamsDto } from './dto/curso-params.dto';

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

  @Get('base/:codigoMatricula')
  cursoBasePorMatricula(
    @Param('codigoMatricula', ParseIntPipe) codigoMatricula: number,
  ) {
    return this.cursosService.buscarCursoBasePorMatricula(codigoMatricula);
  }

  @Get('com-vagas')
  async getCursosWithVagas(@Query() params: CursoParamsDto): Promise<Curso[]> {
    return this.cursosService.getCursosWithVagas(params);
  }
}
