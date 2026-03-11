import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { DocenteGestaoService } from './docente_gestao.service';
import { CreateDocenteGestaoDto } from './dto/create-docente_gestao.dto';
import { UpdateDocenteGestaoDto } from './dto/update-docente_gestao.dto';
import { FindParametrosDocenteTO } from './dto/find-parametros-docente.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('docente-gestao')
export class DocenteGestaoController {
  constructor(private readonly service: DocenteGestaoService) { }
  @Get('/parametros')
  @ApiOperation({
    summary: 'Listar parametros',
  })
  async findAll(@Query() query: FindParametrosDocenteTO) {
    return this.service.getTeacherParameters(query);
  }
  @Patch('/parametros/:id/toggle')
  async toggle(@Param('id') id: number) {
    return this.service.toggleTeacherParameter(Number(id));
  }
}
