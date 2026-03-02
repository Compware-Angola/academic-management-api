import { Controller, Get, Param, ParseIntPipe, Query, Req, ValidationPipe } from '@nestjs/common';
import { DocentesService } from './docentes.service';
import { FindProgramaUCDTO } from './dto/find-programa-uc.dto';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CursosResponseDto } from './dto/curso';
import { CadeirasResponseDto } from './dto/cadeira';

@Controller('docentes')
export class DocentesController {
  constructor(private readonly docentesService: DocentesService) {}

  @Get('/programa-uc')
  findProgramaUC(
    @Query(ValidationPipe) query: FindProgramaUCDTO,
    @Req() req: any,
  ) {
    return this.docentesService.findProgramaUC(query);
  }
  @Get('/programas-sem-ucs')
  findProgramaSemUC(
    @Query(ValidationPipe) query: FindProgramaUCDTO,
    @Req() req: any,
  ) {
    return this.docentesService.findSemProgramaUC(query);
  }
@Get(':docenteId/cursos')
@ApiOperation({ summary: 'Lista cursos do docente' })
@ApiParam({
  name: 'docenteId',
  type: String,
  example: '486',
})
@ApiResponse({
  status: 200,
  description: 'Lista de cursos do docente',
  type: CursosResponseDto,
})
findCursos(
  @Param('docenteId', ParseIntPipe) docenteId: string,
) {
  return this.docentesService.findCursos(docenteId);
}
@Get(':docenteId/:cursoId/:classeId/cadeiras')
@ApiOperation({ summary: 'Lista cadeiras do docente por curso' })
@ApiParam({
  name: 'docenteId',
  type: String,
  example: '486',
})
@ApiParam({
  name: 'cursoId',
  type: String,
  example: '11',
})
@ApiParam({
  name: 'classeId',
  type: String,
  example: '2',
})
@ApiResponse({
  status: 200,
  description: 'Lista de cadeiras do docente no curso',
  type: CadeirasResponseDto,
})
findCadeiras(
  @Param('docenteId', ParseIntPipe) docenteId: string,
  @Param('cursoId', ParseIntPipe) cursoId: string,
  @Param('classeId', ParseIntPipe) classeId: string,
) {
  return this.docentesService.findCadeiras({ docenteId, cursoId, classeId });
}

}
