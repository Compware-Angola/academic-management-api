import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CursosService } from './cursos.service';
import { ApiTags } from '@nestjs/swagger';
import { Query } from '@nestjs/common/decorators';
import { CoursesQueryDto } from './dtos/course.dto';

@ApiTags('cursos')
@Controller('cursos')
export class CursosController {
  constructor(private readonly cursosService: CursosService) {}
  @Get()
  buscarCursos(@Query() filters :CoursesQueryDto) {
    return this.cursosService.buscarCursos(filters);
  }
  @Get('especialidades/:codigoMatricula')
  especialidadesPorCurso(
    @Param('codigoMatricula', ParseIntPipe) codigoMatricula: number,
  ) {
    return this.cursosService.buscarEspecialidadesPorMatricula(codigoMatricula);
  }

  
}
