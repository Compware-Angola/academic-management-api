import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { FilterCandidatoDto } from './dto/filter-candidato.dto';
import { ExamesDeAcessoService } from './exames-de-acesso.service';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateCandidatoDto } from './dto/update-candidato.dto';
import { FilterCandidatoProvaDto } from './dto/filter-candidato-prova.dto';
import { FilterProvaHoraDto } from './dto/filter-prova-hora.dto';
import { FilterProvaResultadoDto } from './dto/filter-prova-resultado.dto';
import { FilterProvaMarcacaoDto } from './dto/filter-prova-marcacao.dto';
import { AdmitirCandidatoPublicoDto } from './dto/admitir-candidato-publico.dto';
import { LancarNotaArquitecturaDto } from './dto/lancar-nota-arquitectura.dto';

@Controller('exames-de-acesso')
@ApiTags('Exames de acesso')
export class ExamesDeAcessoController {
  constructor(private readonly examesAcessoService: ExamesDeAcessoService) { }

  @Get('candidato')
  @ApiOperation({ summary: 'Lista todos os candidatos' })
  @ApiQuery({ name: 'codigoAnoLetivo', required: false, type: Number })
  @ApiQuery({ name: 'codigoCurso', required: false, type: Number })
  @ApiQuery({ name: 'codigoCandidato', required: false, type: Number })
  @ApiQuery({ name: 'codigoTurno', required: false, type: Number })
  @ApiQuery({ name: 'codigoFaculdade', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Retorna lista de candidatos' })
  buscaCandidatos(@Query() filtros: FilterCandidatoDto) {
    return this.examesAcessoService.buscaCandidatos(filtros);
  }

  @Patch('candidato/:codigoCandidato')
  @ApiOperation({ summary: 'Atualiza candidato' })
  @ApiResponse({ status: 200, description: 'Retorna lista de candidatos' })
  atualizaCandidato(
    @Param('codigoCandidato', ParseIntPipe) codigoCandidato: number,
    @Body() dto: UpdateCandidatoDto,
  ) {
    return this.examesAcessoService.atualizaCandidato(dto, codigoCandidato);
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

  @Get('candidatos/prova/lista')
  @ApiOperation({ summary: 'Lista provas por candidato paginada com filtros' })
  @ApiResponse({ status: 200, description: 'Lista de provas por candidato' })
  buscaListaCandidatosProvas(@Query() filtros: FilterCandidatoDto) {
    return this.examesAcessoService.buscaListaCandidatosProvas(filtros);
  }

  @Post('atribuir-prova/:codigoCandidato')
  @ApiOperation({ summary: 'Atribui prova para um candidato' })
  @ApiResponse({ status: 200, description: 'Prova atribuída com sucesso' })
  atribuirProva(
    @Param('codigoCandidato', ParseIntPipe) codigoCandidato: number,
  ) {
    return this.examesAcessoService.atribuirProva(codigoCandidato);
  }

  @Post('admitir-candidato-publico/:codigoCandidato')
  @ApiOperation({ summary: 'Admite candidato universidade pública' })
  @ApiResponse({ status: 200, description: 'Candidato admitido com sucesso' })
  admitirCandidatoAoPublico(
    @Param('codigoCandidato', ParseIntPipe) codigoCandidato: number,
    @Body() dto: AdmitirCandidatoPublicoDto,
  ) {
    return this.examesAcessoService.admitirCandidatoAoPublico(
      codigoCandidato,
      dto.nota,
    );
  }

  @Post('lancar-nota-arquitectura-e-urbanismo/:codigoCandidato')
  @ApiOperation({ summary: 'Lança nota e admite candidato arquitectura e urbanismo' })
  @ApiResponse({ status: 200, description: 'Nota lançada com sucesso' })
  lancarNotaArquitectura(
    @Param('codigoCandidato', ParseIntPipe) codigoCandidato: number,
    @Body() dto: LancarNotaArquitecturaDto,
  ) {
    return this.examesAcessoService.lancarNotaArquitectura(
      codigoCandidato,
      dto.notaPratica,
    );
  }

  @Patch('resetar-prova/:codigoCandidato')
  @ApiOperation({ summary: 'Reseta a prova de um candidato' })
  @ApiResponse({ status: 200, description: 'Prova resetada com sucesso' })
  resetarProva(
    @Param('codigoCandidato', ParseIntPipe) codigoCandidato: number,
  ) {
    return this.examesAcessoService.resetarProva(codigoCandidato);
  }
}
