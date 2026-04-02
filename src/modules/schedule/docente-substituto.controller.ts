
import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DocenteSubstitutoService } from './docente-substituto.service';
import { ListDocenteSubstitutoDto } from './dto/list-docente-substituto.dto';
import { CreateDocenteSubstitutoDto } from './dto/create-docente-substituto.dto';

@ApiTags('DOCENTE SUBSTITUTO')
@Controller('docente-substituto')
export class DocenteSubstitutoController {
  constructor(private readonly service: DocenteSubstitutoService) {}

@Post()
@ApiOperation({ summary: 'Criar um novo registo de docente substituto' })
create(@Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateDocenteSubstitutoDto) {
  return this.service.create(1, dto);
}

@Put(':id')
@ApiOperation({ summary: 'Atualizar um registo de docente substituto' })
update(
  @Param('id') id: string,
  @Body(new ValidationPipe({ transform: true, whitelist: true })) dto: CreateDocenteSubstitutoDto,
) {
  return this.service.update(+id, 1, dto);
}

  @Get()
  @ApiOperation({ summary: 'Listar docentes substitutos com filtros e paginação' })
  findAll(@Query(new ValidationPipe({ transform: true, whitelist: true })) filters: ListDocenteSubstitutoDto) {
    return this.service.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar um docente substituto por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }



  @Delete(':id')
  @ApiOperation({ summary: 'Remover (soft delete) um docente substituto' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id, 1);
  }
}