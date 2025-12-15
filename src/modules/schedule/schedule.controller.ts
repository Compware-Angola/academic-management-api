import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  ValidationPipe,
  Query,
  ParseIntPipe,
  UsePipes,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ListScheduleDto } from './dto/list-schedule.dto';
import { ListScheduleUCDto } from './dto/list-schedule-uc.dto';
import { CreatePermissionEditScheduleDto } from './dto/create-permission-edit-schedule.dto';
import { ListScheduleDocenteDto } from './dto/list-schedule-docente.dto';
import { MoveStudentsToScheduleDto } from './dto/move-students-to-schedule.dto';
import { ListScheduleDayOfWeekto } from './dto/list-schedule-day-of-week.dto';

@ApiTags('schedule')
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // ================ PERMISSÃO DE EDIÇÃO ================
  @Post('permission') // Corrigido: era ':permission' → 'permission'
  @ApiOperation({ summary: 'Criar nova permissão para editar horário' })
  @ApiResponse({ status: 201, description: 'Permissão criada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  createPermission(
    @Body(ValidationPipe) createPermissionEditScheduleDto: CreatePermissionEditScheduleDto,
  ) {
    return this.scheduleService.createPermissionToEditSchedule(
      createPermissionEditScheduleDto,
    );
  }

  // ================ LISTAGENS ================
  @Get()
  @ApiOperation({ summary: 'Listar horários com filtros avançados e paginação' })
  findAll(@Query(ValidationPipe) query: ListScheduleDto) {
    return this.scheduleService.findAll(query);
  }

  @Get('by-uc')
  @ApiOperation({ summary: 'Listar horários por UC com filtros avançados' })
  findScheduleByUC(@Query(ValidationPipe) query: ListScheduleUCDto) {
    return this.scheduleService.findScheduleByUC(query);
  }

  @Get('by-docente')
  @ApiOperation({ summary: 'Listar horário por docente' })
  findScheduleByDocente(@Query(ValidationPipe) query: ListScheduleDocenteDto) {
    return this.scheduleService.findScheduleByDocente(query);
  }

  @Get('by-day-of-week')
  @ApiOperation({ summary: 'Listar horário por dia da semana' })
  findScheduleByDayOfTheweek(@Query(ValidationPipe) query: ListScheduleDayOfWeekto) {
    return this.scheduleService.findScheduleByDayOfTheweek(query);
  }

  @Get('registration-by-schedule')
  findAllRegistrationBySchedule(@Query(ValidationPipe) query: ListScheduleDto) {
    return this.scheduleService.findAllRegistrationBySchedule(query);
  }

  @Get('registration-by-schedule/details/:scheduleId')
  detailsRegistrationBySchedule(@Param('scheduleId', ParseIntPipe) scheduleId: number) {
    return this.scheduleService.detailsRegistrationBySchedule(scheduleId);
  }

  @Get('eliminated')
  findAllDeleted(@Query(ValidationPipe) query: ListScheduleDto) {
    return this.scheduleService.findAllDeleted(query);
  }

  @Get('designation/:designation')
  @ApiOperation({ summary: 'Buscar horário completo pela designação' })
  @ApiParam({ name: 'designation', example: 'ACSP.2.HEMAT I-H1' })
  findOneByDesignation(@Param('designation') designation: string) {
    return this.scheduleService.findOneByDesignation(designation);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar horário completo por ID' })
  @ApiParam({ name: 'id', example: 13047 })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.findOneById(id);
  }

  // ================ CRIAÇÃO (O QUE ESTAVA A DAR ERRO) ================
  @Post(':userId')
  @ApiOperation({ summary: 'Criar novo horário de uma UC' })
  @ApiParam({ name: 'userId', type: Number, description: 'ID do usuário' })
  @ApiResponse({ status: 201, description: 'Horário criado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  create(
    @Param('userId', ParseIntPipe) userId: number,
    @Body(ValidationPipe) createScheduleDto: CreateScheduleDto, // <--- AQUI ESTAVA O PROBLEMA!
  ) {
    return this.scheduleService.create(userId, createScheduleDto);
  }

  // ================ ATUALIZAÇÃO ================
  @Put(':userId/:id')
  @ApiOperation({ summary: 'Atualizar horário de uma UC' })
  @ApiParam({ name: 'userId', type: Number })
  @ApiParam({ name: 'id', type: Number })
  update(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.scheduleService.update(userId, id, updateScheduleDto);
  }

  // ================ MOVIMENTAR ESTUDANTES ================
  @Post('move-students/:userId')
  @ApiOperation({ summary: 'Movimentar Estudante' })
  @ApiParam({ name: 'userId', type: Number, description: 'ID do usuário' })
  moveStudents(
    @Param('userId', ParseIntPipe) userId: number,
    @Body(ValidationPipe) dto: MoveStudentsToScheduleDto,
  ) {
    return this.scheduleService.moveStudents(dto, userId);
  }

  // ================ OUTRAS AÇÕES ================
  @Delete(':horarioId/excluir/:userId')
  delete(
    @Param('horarioId', ParseIntPipe) horarioId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.scheduleService.delete(userId, horarioId);
  }

  @Patch(':horarioId/disponibilidade/:userId')
  toggleAvailability(
    @Param('horarioId', ParseIntPipe) horarioId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.scheduleService.toggleAvailability(userId, horarioId);
  }

  @Patch(':horarioId/validar/:userId')
  validate(
    @Param('horarioId', ParseIntPipe) horarioId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.scheduleService.validate(userId, horarioId);
  }

  @Patch(':horarioId/restaurar/:userId')
  restore(
    @Param('horarioId', ParseIntPipe) horarioId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.scheduleService.restore(userId, horarioId);
  }
}