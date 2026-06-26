import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AcademicCalendarService } from './academic_calendar.service';

import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ViewMonthsDto } from './dto/view-months.dto';
import { PermissionsGuard } from '../../common/secret/permissions.guard';
import { RemoteJwtAuthGuard } from '../../common/guard/remote.jwt-auth.guard';
import { GenerateMesTempDTO } from './dto/generate-mes-temp.dto';
import { CreateMesTempDTO } from './dto/create-mes-temp.dto';
import { CreateAcademicCalendarDto } from './dto/create-academic_calendar.dto';
@UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('academic-calendar')
export class AcademicCalendarController {
  constructor(
    private readonly academicCalendarService: AcademicCalendarService,
  ) { }
  @Get('generate-mes-temp')
  async searchCurricularByStudenty(@Query() params: GenerateMesTempDTO) {
    return this.academicCalendarService.generateMesTemp(params);
  }

  @Get('academic-year/all')
  @ApiOperation({ summary: 'Lista anos lectivos com periodos semestrais configurados' })
  @ApiResponse({ status: 200, description: 'Consulta de anos lectivos realizada com sucesso' })
  async findAcademicYearsWithConfiguredSemesters() {
    return this.academicCalendarService.findAcademicYearsWithConfiguredSemesters();
  }

  @Get('application-types/all')
  @ApiOperation({ summary: 'Lista tipos de candidatura ativos' })
  @ApiQuery({
    name: 'posgraduacao',
    required: false,
    type: Boolean,
    description:
      'Quando true, retorna apenas tipos de pós-graduação (Mestrado = 2 e Doutoramento = 3)',
  })
  @ApiResponse({ status: 200, description: 'Tipos de candidatura retornados com sucesso' })
  async findActiveApplicationTypes(
    @Query('posgraduacao') posgraduacao?: string,
  ) {
    const onlyPosGraduacao = posgraduacao === 'true' || posgraduacao === '1';
    return this.academicCalendarService.findActiveApplicationTypes(onlyPosGraduacao);
  }

  @Get('academic-year/:anolectivo')
  @ApiOperation({ summary: 'Busca parametros de um ano lectivo especifico' })
  @ApiResponse({ status: 200, description: 'Ano lectivo retornado com sucesso' })
  async findAcademicYearParams(@Param('anolectivo', ParseIntPipe) anolectivo: number) {
    return this.academicCalendarService.findAcademicYearParams(anolectivo);
  }

  @Post('academic-year')
  @ApiOperation({ summary: 'Cria um ano lectivo com os periodos semestrais' })
  @ApiResponse({ status: 201, description: 'Ano lectivo criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou ano lectivo já existente' })
  async createAcademicYear(@Body() body: CreateAcademicCalendarDto) {
    return this.academicCalendarService.createAcademicYear(body);
  }

  @Put('academic-year/:anolectivo')
  @ApiOperation({ summary: 'Atualiza o estado de um ano lectivo' })
  @ApiResponse({ status: 200, description: 'Estado do ano lectivo atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou ano lectivo não encontrado' })
  async updateAcademicYearState(
    @Param('anolectivo', ParseIntPipe) anolectivo: number,
    @Body('estado', ParseIntPipe) estado: number,
  ) {
    return this.academicCalendarService.updateAcademicYearState(
      anolectivo,
      estado,
    );
  }

  @Get('vacancies/:anolectivo/:tpcandidatura')
  @ApiOperation({ summary: 'Lista vagas por ano lectivo e tipo de candidatura' })
  @ApiResponse({ status: 200, description: 'Vagas retornadas com sucesso' })
  async findVacanciesByAcademicYearAndApplicationType(
    @Param('anolectivo', ParseIntPipe) anolectivo: number,
    @Param('tpcandidatura', ParseIntPipe) tpcandidatura: number,
  ) {
    return this.academicCalendarService.findVacanciesByAcademicYearAndApplicationType(
      anolectivo,
      tpcandidatura,
    );
  }

  @Post('vacancies')
  @ApiOperation({ summary: 'Cria vagas para um ano lectivo' })
  @ApiResponse({ status: 201, description: 'Vagas criadas com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async createAcademicYearVacancies(@Body() body: any) {
    return this.academicCalendarService.createAcademicYearVacancies(body);
  }

  @Put('vacancies')
  @ApiOperation({ summary: 'Atualiza o numero de vagas' })
  @ApiResponse({ status: 200, description: 'Numero de vagas atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou vaga não encontrada' })
  async updateVacancyNumber(
    @Body('id', ParseIntPipe) id: number,
    @Body('num_vagas', ParseIntPipe) numVagas: number,
  ) {
    return this.academicCalendarService.updateVacancyNumber(id, numVagas);
  }

  @Get('vacancies')
  @ApiOperation({ summary: 'Lista vagas do ano lectivo ativo' })
  @ApiResponse({ status: 200, description: 'Vagas retornadas com sucesso' })
  async findVacanciesFromActiveAcademicYear() {
    return this.academicCalendarService.findVacanciesFromActiveAcademicYear();
  }

  @Get('monthly-fees/:anolectivo')
  @ApiOperation({ summary: 'Lista mensalidades por ano lectivo' })
  @ApiResponse({ status: 200, description: 'Mensalidades retornadas com sucesso' })
  async findMonthlyFeesByAcademicYear(@Param('anolectivo', ParseIntPipe) anolectivo: number) {
    return this.academicCalendarService.findMonthlyFeesByAcademicYear(anolectivo);
  }

  @Get('meses-prestacoes')
  @ApiOperation({
    summary: 'Lista os meses/prestações configurados',
    description: `
    Retorna os registros ativos da tabela <code>FK2_MES_TEMP</code>.<br><br>
    <strong>Parâmetros obrigatórios:</strong><br>
    - <code>anoLectivo</code>: Ano letivo para filtrar (ex: 2025)<br><br>
    <strong>Parâmetro opcional:</strong><br>
    - <code>semestre</code>: Filtra por semestre específico (ex: 1 ou 2). Se não informado, retorna todos os semestres do ano.<br><br>
    Ordenado por <code>ORDEM_MES</code>.
  `,
  })
  @ApiQuery({ name: 'anoLectivo', required: true, type: Number, example: 23 })
  @ApiQuery({ name: 'semestre', required: false, type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Lista retornada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros inválidos (ex: anoLectivo ausente ou inválido)',
  })
  @ApiResponse({ status: 500, description: 'Erro interno' })
  async viewMonths(@Query(ValidationPipe) params: ViewMonthsDto) {
    return this.academicCalendarService.viewMonths(params);
  }

  @Post('create-mes-temp')
  @ApiOperation({ summary: 'Cria um novo novo mes temp' })
  @ApiResponse({ status: 201, description: 'Parâmetro criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async createParametro(@Body(ValidationPipe) dto: CreateMesTempDTO) {
    return this.academicCalendarService.createMesTemp(dto);
  }

  @Get('configuracao-geral')
  @ApiOperation({
    summary: 'Lista os meses/prestações configurados',

  })

  @ApiResponse({ status: 200, description: 'Lista retornada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Parâmetros inválidos (ex: anoLectivo ausente ou inválido)',
  })
  @ApiResponse({ status: 500, description: 'Erro interno' })
  async configuracaoGeral() {
    return this.academicCalendarService.configuracaoGeral();
  }
}
