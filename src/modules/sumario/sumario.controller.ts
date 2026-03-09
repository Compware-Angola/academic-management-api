import { Controller, Get, Post, Body, Param, Query, Put, Patch } from '@nestjs/common';
import { SumarioService } from './sumario.service';
import { FindAulasAgendadasSumarioDto } from './dto/find-aulas-agendadas-sumario.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateSumarioDto } from './dto/create-sumario.dto';
import { UpdateSumarioDto } from './dto/update-sumario.dto';
import { FindSumarioDto } from './dto/find-sumario.dto';

@ApiTags('SUMÁRIO')
@Controller('sumario')
export class SumarioController {

  constructor(private readonly sumarioService: SumarioService) {}

  @Get()
  @ApiOperation({
    summary: 'Obter sumários',
    description: 'Retorna uma lista de sumários com base nos filtros fornecidos.',
  })
  @ApiResponse({ status: 200, description: 'Sumários encontrados com sucesso.' })
  async getSumarios(@Query() dto: FindSumarioDto) {
    return this.sumarioService.getSumarios(dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Criar um novo sumário',
    description: 'Cria um novo sumário para um agendamento de aula específico.',
  })
  @ApiResponse({ status: 201, description: 'Sumário criado com sucesso.' })
  async create(@Body() createSumarioDto: CreateSumarioDto) {
    return this.sumarioService.createSumario(createSumarioDto);
  }

  @Put(':codigo')
  @ApiOperation({
    summary: 'Atualizar um sumário existente',
  })
  @ApiResponse({ status: 200, description: 'Sumário atualizado com sucesso.' })
  async update(
    @Body() updateSumarioDto: UpdateSumarioDto,
    @Param('codigo') codigo: number,
  ) {
    return this.sumarioService.updateSumario(updateSumarioDto, codigo);
  }

  @Patch(':codigo/validar/:estado')
  @ApiOperation({
    summary: 'Validar um sumário',
    description: 'Valida um sumário específico, alterando seu estado para validado.',
  })
  @ApiResponse({ status: 200, description: 'Sumário validado com sucesso.' })
  async validarSumario(@Param('codigo') codigo: number, @Param('estado') estado: number) {
    return this.sumarioService.validarSumario(estado, codigo);
  }
  @Get('aulas-agendadas')
  @ApiOperation({
    summary: 'Obter aulas agendadas com sumários',
  })
  async getAulasAgendadas(@Query() dto: FindAulasAgendadasSumarioDto) {
    return this.sumarioService.getAulasAgendadas(dto);
  }

  @Get('controle-geral-assiduidade')
  @ApiOperation({
    summary: 'Obter controle geral de assiduidade',
  })
  async controleGeralAssiduidade(@Query() dto: FindAulasAgendadasSumarioDto) {
    return this.sumarioService.getEstatisticaSumarioAssiduidade(dto);
  }
}