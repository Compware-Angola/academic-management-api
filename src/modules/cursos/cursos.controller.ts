import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CursosService } from './cursos.service';
import { ApiTags } from '@nestjs/swagger';



@ApiTags('cursos')
@Controller('cursos')
export class CursosController {
  constructor(
   private readonly cursosService: CursosService,
   
  ) {}
 
  @Get('especialidades/:cursoId')
  especialidadesPorCurso(@Param('cursoId', ParseIntPipe) cursoId: number) {
    return this.cursosService.buscarEspecialidadesPorCurso(cursoId);
  }
}
