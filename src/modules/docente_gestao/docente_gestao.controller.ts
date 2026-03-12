import { Controller, Get, Post, Body, Patch, Param, Delete, Query} from '@nestjs/common';
import { DocenteGestaoService } from './docente_gestao.service';
import { CreateDocenteGestaoDto } from './dto/create-docente_gestao.dto';
import { UpdateDocenteGestaoDto } from './dto/update-docente_gestao.dto';
import { FilterDocenteDto } from './dto/filter-docente.dto';
import { ApiOperation ,ApiResponse } from '@nestjs/swagger';


@Controller('docente-gestao')
export class DocenteGestaoController {
  constructor(private readonly docenteGestaoService: DocenteGestaoService) {}

  @Post()
  create(@Body() createDocenteGestaoDto: CreateDocenteGestaoDto) {
    return this.docenteGestaoService.create(createDocenteGestaoDto);
  }

  @Get()
  findAll() {
    return this.docenteGestaoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.docenteGestaoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDocenteGestaoDto: UpdateDocenteGestaoDto) {
    return this.docenteGestaoService.update(+id, updateDocenteGestaoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.docenteGestaoService.remove(+id);
  }

@Get('docentes')
@ApiOperation({ summary: 'Listar todos os professores por área de formação' })
@ApiResponse({ status: 200 })
async listDocentes(@Query() dto: FilterDocenteDto) {
  return this.docenteGestaoService.listDocentes(dto);
}
  
}
