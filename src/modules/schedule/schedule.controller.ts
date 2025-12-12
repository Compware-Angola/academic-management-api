import { Controller, Get, Post, Body, Patch, Param, Delete, Put, ValidationPipe, Query, ParseIntPipe } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ListScheduleDto } from './dto/list-schedule.dto';
import { ListScheduleUCDto } from './dto/list-schedule-uc.dto';
@ApiTags("schedule")
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) { }

  @Get()
  @ApiOperation({
    summary: 'Listar horários com filtros avançados e paginação',
    description: 'Retorna horários filtrados por ano letivo, curso, docente, estado, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de horários retornada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async findAll(@Query(ValidationPipe) query: ListScheduleDto) {


    return this.scheduleService.findAll(query);
  }
    @Get("by-uc")
  @ApiOperation({
    summary: 'Listar horários com filtros avançados e paginação',
    description:
      'Retorna horários filtrados por ano letivo, curso, docente, estado, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de horários retornada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async findScheduleByUC(@Query(ValidationPipe) query: ListScheduleUCDto) {
    return this.scheduleService.findScheduleByUC(query);
  }
    @Get('registration-by-schedule')
  @ApiOperation({
    summary: 'Listar horários Por Incricoes com filtros avançados e paginação',
    description: 'Retorna horários filtrados por ano letivo, curso, docente, estado, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de horários Por Inscricao retornada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async findAllRegistrationBySchedule(@Query(ValidationPipe) query: ListScheduleDto) {


    return this.scheduleService.findAllRegistrationBySchedule(query);
  }
    @Get('registration-by-schedule/details/:scheduleId')
  @ApiOperation({
    summary: 'Listar horários Por Incricoes com filtros avançados e paginação',
    description: 'Retorna horários filtrados por ano letivo, curso, docente, estado, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de horários Por Inscricao retornada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async detailsRegistrationBySchedule(@Param('scheduleId', ParseIntPipe) scheduleId: number) {


    return this.scheduleService.detailsRegistrationBySchedule(scheduleId);
  }
  @Get('eliminated')
  @ApiOperation({
    summary: 'Listar horários Eliminados com filtros avançados e paginação',
    description: 'Retorna horários filtrados por ano letivo, curso, docente, estado, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de horários Eliminados retornada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async findAllDeleted(@Query(ValidationPipe) query: ListScheduleDto) {
    return this.scheduleService.findAllDeleted(query);
  }
  @Get(':id')
@ApiOperation({ summary: 'Buscar horário completo por ID' })
@ApiParam({ name: 'id', example: 13047 })
@ApiResponse({ status: 200, description: 'Horário encontrado' })
@ApiResponse({ status: 404, description: 'Horário não encontrado' })
async findOne(@Param('id', ParseIntPipe) id: number) {
  return this.scheduleService.findOneById(id);
}
  @Post(':userId')
  @ApiOperation({ summary: 'Criar novo horário de uma UC' })
  @ApiParam({ name: 'userId', type: Number, required: true, description: 'ID do usuário' })
  @ApiResponse({ status: 201, description: 'Horário criado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  create(
    @Param('userId') userId: number,
    @Body() createScheduleDto: CreateScheduleDto,
  ) {
    return this.scheduleService.create(userId, createScheduleDto);
  }
  @Put(':userId/:id')
  @ApiOperation({ summary: 'Atualizar horário de uma UC' })
  @ApiParam({ name: 'userId', type: Number, required: true, description: 'ID do usuário' })
  @ApiParam({ name: 'id', type: Number, required: true, description: 'ID do horário' })
  @ApiResponse({ status: 200, description: 'Horário atualizado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Horário não encontrado.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  update(
    @Param('userId') userId: number,
    @Param('id') id: number,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.scheduleService.update(userId, id, updateScheduleDto);
  }

  @Delete(':horarioId/excluir/:userId')
  @ApiOperation({
    summary: 'Excluir horário (soft delete)',
    description: 'Define ACTIVE_STATE = 0 e registra quem excluiu'
  })
  @ApiParam({ name: 'horarioId', example: 13047 })
  @ApiParam({ name: 'userId', example: 57 })
  @ApiResponse({ status: 200, description: 'Horário excluído com sucesso' })
  @ApiResponse({ status: 404, description: 'Horário não encontrado' })
  async delete(
    @Param('horarioId', ParseIntPipe) horarioId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.scheduleService.delete(userId, horarioId);
  }
  @Patch(':horarioId/disponibilidade/:userId')
  @ApiOperation({
    summary: 'Alternar disponibilidade do horário (toggle)',
    description: 'Se estava disponível → fecha. Se estava fechado → abre.',
  })
  @ApiParam({ name: 'horarioId', description: 'ID do horário', example: 123 })
  @ApiParam({ name: 'userId', description: 'ID do utilizador que está a alterar', example: 57 })
  @ApiResponse({ status: 200, description: 'Disponibilidade alterada com sucesso' })
  @ApiResponse({ status: 404, description: 'Horário não encontrado' })
  async toggleAvailability(
    @Param('horarioId', ParseIntPipe) horarioId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.scheduleService.toggleAvailability(userId, horarioId);
  }
  @Patch(':horarioId/validar/:userId')
  @ApiOperation({
    summary: 'Validar horário (avançar no workflow)',
    description: 'Avança o estado do horário conforme o workflow definido'
  })
  @ApiParam({ name: 'horarioId', example: 13047 })
  @ApiParam({ name: 'userId', example: 57 })
  @ApiResponse({ status: 200, description: 'Horário validado com sucesso' })
  @ApiResponse({ status: 404, description: 'Horário não encontrado' })
  @ApiResponse({ status: 400, description: 'Não foi possível validar' })
  async validate(
    @Param('horarioId', ParseIntPipe) horarioId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.scheduleService.validate(userId, horarioId);
  }
@Patch(':horarioId/restaurar/:userId')
@ApiOperation({ 
  summary: 'Restaurar horário excluído (reverter soft delete)',
  description: 'Torna o horário ativo novamente (ACTIVE_STATE = 1)'
})
@ApiParam({ name: 'horarioId', example: 13047 })
@ApiParam({ name: 'userId', example: 57 })
@ApiResponse({ status: 200, description: 'Horário restaurado com sucesso' })
@ApiResponse({ status: 404, description: 'Horário não está excluído' })
async restore(
  @Param('horarioId', ParseIntPipe) horarioId: number,
  @Param('userId', ParseIntPipe) userId: number,
) {
  return this.scheduleService.restore(userId, horarioId);
}
}
