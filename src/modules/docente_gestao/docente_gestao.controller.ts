import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DocenteGestaoService } from './docente_gestao.service';
import { CreateDocenteGestaoDto } from './dto/create-docente_gestao.dto';
import { UpdateDocenteGestaoDto } from './dto/update-docente_gestao.dto';

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
}
