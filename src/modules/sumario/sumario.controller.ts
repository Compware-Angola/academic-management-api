import { Controller, Get, Post, Body, Param, Query, Put } from '@nestjs/common';
import { SumarioService } from './sumario.service';

import { FindAulasAgendadasSumarioDto } from './dto/find-aulas-agendadas-sumario.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateSumarioDto } from './dto/create-sumario.dto';
import { UpdateSumarioDto } from './dto/update-sumario.dto';
ApiTags('SUMÁRIO')
@Controller('sumario')
 export class SumarioController {
  constructor(private readonly sumarioService: SumarioService) { }
  @Post()
  @ApiOperation({
    summary: 'Criar um novo sumário (POST)',
    description: 'Cria um novo sumário para um agendamento de aula específico.',
  })
  @ApiResponse({ status: 201, description: 'Sumário criado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos.' })
  async create(@Body() createSumarioDto: CreateSumarioDto) {
    return this.sumarioService.createSumario(createSumarioDto);
  }
  @Put(':codigo')
  @ApiOperation({
    summary: 'Atualizar um sumário existente (PUT)',
    description: 'Atualiza as informações de um sumário existente, como descrição e estado.',
  })
  @ApiResponse({ status: 200, description: 'Sumário atualizado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos.' })
  async update(@Body() updateSumarioDto: UpdateSumarioDto, @Param('codigo') codigo: number) {
    return this.sumarioService.updateSumario(updateSumarioDto, codigo);
  }
  @Get('aulas-agendadas')
  @ApiOperation({
    summary: 'Obter aulas agendadas com sumários',
    description: 'Retorna uma lista de aulas agendadas junto com seus respectivos sumários.',
  })
  @ApiResponse({ status: 200, description: 'Aulas agendadas encontradas com sucesso.' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos.' })
  async getAulasAgendadas(@Query() dto: FindAulasAgendadasSumarioDto) {
    return this.sumarioService.getAulasAgendadas(dto);
  }
  @Get('controle-geral-assiduidade')
  @ApiOperation({
    summary: 'Obter controle geral de assiduidade',
    description: 'Retorna um controle geral de assiduidade para aulas agendadas, incluindo informações sobre docentes, unidades curriculares e estados de agendamento.',
  })
  @ApiResponse({ status: 200, description: 'Controle geral de assiduidade encontrado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos.' })
  async controleGeralAssiduidade(@Query() dto: FindAulasAgendadasSumarioDto) {
    return this.sumarioService.estatisticasPorDocenteComContexto(dto);
   }
}
