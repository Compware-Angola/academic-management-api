import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  ValidationPipe,
  Delete,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { HorarioProvaService } from './horario-prova.service';
import { FilterHorarioProvaDto } from './dto/filter-horario-prova.dto';
import { CreateHorarioProvaDto } from './dto/create-horario-prova.dto';
import { UpdateHorarioProvaDto } from './dto/update-horario-prova.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('exames-de-acesso/horario-prova')
@ApiTags('Horário de Provas')
export class HorarioProvaController {
  constructor(private readonly horarioProvaService: HorarioProvaService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista todos os horários de provas com filtros e paginação',
  })
  findAll(@Query(ValidationPipe) filtros: FilterHorarioProvaDto) {
    return this.horarioProvaService.findAll(filtros);
  }

  @Post()
  @ApiOperation({
    summary: 'Cria um novo horário de prova',
  })
  create(@Body(ValidationPipe) createHorarioProvaDto: CreateHorarioProvaDto) {
    return this.horarioProvaService.create(createHorarioProvaDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza um horário de prova existente',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateHorarioProvaDto: UpdateHorarioProvaDto,
  ) {
    return this.horarioProvaService.update(id, updateHorarioProvaDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remove um horário de prova',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.horarioProvaService.remove(id);
  }
}

