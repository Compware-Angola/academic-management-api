import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { VagasService } from './vagas.service';
import { FilterVagasDto } from './dto/filter-vagas.dto';
import { CreateVagaDto } from './dto/create-vaga.dto';
import { UpdateVagaDto } from './dto/update-vaga.dto';

@Controller('vagas')
@ApiTags('Vagas de Cursos')
export class VagasController {
  constructor(private readonly vagasService: VagasService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista vagas de cursos com paginação',
    description:
      'Retorna as vagas disponíveis por curso, período e ano letivo com cálculo automático de vagas disponíveis baseado nas matrículas confirmadas',
  })
  findAll(@Query(ValidationPipe) filtros: FilterVagasDto) {
    return this.vagasService.findAll(filtros);
  }

  @Post()
  @ApiOperation({
    summary: 'Cria uma nova vaga',
    description: 'Cadastra uma nova vaga de curso para um período e ano letivo',
  })
  create(@Body(ValidationPipe) createVagaDto: CreateVagaDto) {
    return this.vagasService.create(createVagaDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza uma vaga existente',
    description: 'Atualiza os dados de uma vaga de curso',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateVagaDto: UpdateVagaDto,
  ) {
    return this.vagasService.update(id, updateVagaDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remove uma vaga',
    description: 'Remove permanentemente uma vaga do sistema',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vagasService.remove(id);
  }
}
