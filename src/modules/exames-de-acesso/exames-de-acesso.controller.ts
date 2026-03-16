import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { FilterCandidatoDto } from './dto/filter-candidato.dto';
import { ExamesDeAcessoService } from './exames-de-acesso.service';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateCandidatoDto } from './dto/update-candidato.dto';
import { FilterCandidatoProvaDto } from './dto/filter-candidato-prova.dto';
import { FilterProvaHoraDto } from './dto/filter-prova-hora.dto';
import { FilterProvaResultadoDto } from './dto/filter-prova-resultado.dto';
import { FilterProvaMarcacaoDto } from './dto/filter-prova-marcacao.dto';

@Controller('exames-de-acesso')
@ApiTags('Exames de acesso')
export class ExamesDeAcessoController {
  constructor(private readonly examesAcessoService: ExamesDeAcessoService) {}

  @Get('candidato')
  @ApiOperation({ summary: 'Lista todos os candidatos' })
  @ApiQuery({ name: 'codigoAnoLetivo', required: false, type: Number })
  @ApiQuery({ name: 'codigoCurso', required: false, type: Number })
  @ApiQuery({ name: 'codigoCandidato', required: false, type: Number })
  @ApiQuery({ name: 'codigoTurno', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Retorna lista de candidatos' })
  buscaCandidatos(@Query() filtros: FilterCandidatoDto) {
    return this.examesAcessoService.buscaCandidatos(filtros);
  }

  @Patch('candidato')
  @ApiOperation({ summary: 'Atualiza candidato' })
  @ApiResponse({ status: 200, description: 'Retorna lista de candidatos' })
  atualizaCandidato(@Body() dto: UpdateCandidatoDto) {
    return this.examesAcessoService.atualizaCandidato(dto);
  }

  @Get('candidatos/prova')
  @ApiOperation({ summary: 'Lista candidatos com prova' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getCandidatosProvas(@Query() filtros: FilterCandidatoProvaDto) {
    return this.examesAcessoService.buscaCandidatosProvas(filtros);
  }

  @Get('candidatos/prova/horario')
  @ApiOperation({ summary: 'Lista horarios da prova' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getProvaHorarios(@Query() filtros: FilterProvaHoraDto) {
    return this.examesAcessoService.buscaProvaHorarios(filtros);
  }

  @Get('candidatos/prova/resultado')
  @ApiOperation({ summary: 'Lista resultados da prova' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getProvaResultados(@Query() filtros: FilterProvaResultadoDto) {
    return this.examesAcessoService.buscaProvaResultados(filtros);
  }

  @Get('candidatos/prova/marcacao')
  @ApiOperation({ summary: 'Lista marcacao da prova' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getProvaMarcacoes(@Query() filtros: FilterProvaMarcacaoDto) {
    return this.examesAcessoService.buscaProvaMarcacoes(filtros);
  }

  // TODO atribuir prova para uma lista de candidatos
}
