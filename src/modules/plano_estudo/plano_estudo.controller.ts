import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PlanoEstudoService } from './plano_estudo.service';
import { CreatePlanoEstudoDto } from './dto/create-plano_estudo.dto';
import { UpdatePlanoEstudoDto } from './dto/update-plano_estudo.dto';

@Controller('plano-estudo')
export class PlanoEstudoController {
  constructor(private readonly planoEstudoService: PlanoEstudoService) {}

  @Post()
  create(@Body() createPlanoEstudoDto: CreatePlanoEstudoDto) {
    return this.planoEstudoService.create(createPlanoEstudoDto);
  }

  @Get()
  findAll() {
    return this.planoEstudoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.planoEstudoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlanoEstudoDto: UpdatePlanoEstudoDto) {
    return this.planoEstudoService.update(+id, updatePlanoEstudoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.planoEstudoService.remove(+id);
  }
}
