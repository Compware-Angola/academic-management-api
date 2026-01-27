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
  UseGuards,
  Req,
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
import { ListScheduleClassRoomDto } from './dto/list-schedule-class-room.dto';
import { FindScheduleByDesignationDto } from './dto/find-schedule-by-designation.dto';
import { FindSchedulesByGradeDto } from './dto/find-schedules-by-gradedto';
import { ListScheduleWithPermissionDto } from './dto/list-schedule-with-permission.dto';
import { UpdatePermissionEditScheduleDto } from './dto/update-permission-edit-schedule.dto';

import { AccessLogHelper } from '../common/helpers/access-log.helper';
import { HttpService } from '@nestjs/axios';
import { PermissionsGuard } from '../common/secret/permissions.guard';
import { RemoteJwtAuthGuard } from '../common/guard/remote.jwt-auth.guard';
import { PermissionTypeDetails } from '../common/enums/permission.type';
import { RequiredPermissions } from '../common/pipes/permissions.decorator';

@ApiTags('schedule')
 @UseGuards(RemoteJwtAuthGuard, PermissionsGuard)
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService, private httpService: HttpService) { }

  // ================ PERMISSÃO DE EDIÇÃO ================
  @Post('permission')
  @ApiOperation({ summary: 'Criar nova permissão para editar horário' })
  @ApiResponse({ status: 201, description: 'Permissão criada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  createPermission(
    @Body(ValidationPipe)
    createPermissionEditScheduleDto: CreatePermissionEditScheduleDto,
  ) {
    return this.scheduleService.createPermissionToEditSchedule(
      createPermissionEditScheduleDto,
    );
  }

  // ================ LISTAGENS ================
  @Get()
  @RequiredPermissions(PermissionTypeDetails.LISTAR_HORARIOS.sigla)
  @ApiOperation({
    summary: 'Listar horários com filtros avançados e paginação',
  })
  findAll(@Query(ValidationPipe) query: ListScheduleDto, @Req() req: any,) {

    return this.scheduleService.findAll(query);
  }

  @Get('with-permission')
  @ApiOperation({
    summary: 'Listar horários com filtros avançados e paginação com permissão',
  })
  findAllWithPermission(
    @Query(ValidationPipe) query: ListScheduleWithPermissionDto,
  ) {
    return this.scheduleService.findAllWithPermission(query);
  }

  @Put('with-permission/:permissionId')
  @ApiOperation({
    summary: 'Atualizar permissão de edição de horário pelo ID da permissão',
  })
  updatePermissionToEditSchedule(
    @Param('permissionId', ValidationPipe) permissionId: number,
    @Body(ValidationPipe) query: UpdatePermissionEditScheduleDto,
  ) {
    return this.scheduleService.updatePermissionToEditSchedule(
      permissionId,
      query,
    );
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
  findScheduleByDayOfTheweek(
    @Query(ValidationPipe) query: ListScheduleDayOfWeekto,
  ) {
    return this.scheduleService.findScheduleByDayOfTheweek(query);
  }
  @Get('by-class-room')
  @ApiOperation({ summary: 'Listar horário por dia da semana' })
  findScheduleByClassRoom(
    @Query(ValidationPipe) query: ListScheduleClassRoomDto,
  ) {
    return this.scheduleService.findScheduleByClassRoom(query);
  }

  @Get('registration-by-schedule')
  findAllRegistrationBySchedule(@Query(ValidationPipe) query: ListScheduleDto) {
    return this.scheduleService.findAllRegistrationBySchedule(query);
  }

  @Get('registration-by-schedule/details/:scheduleId')
  detailsRegistrationBySchedule(
    @Param('scheduleId', ParseIntPipe) scheduleId: number,
  ) {
    return this.scheduleService.detailsRegistrationBySchedule(scheduleId);
  }

  @Get('eliminated')
  @RequiredPermissions(PermissionTypeDetails.LISTAR_HORARIOS_ELIMINADOS.sigla)
  findAllDeleted(@Query(ValidationPipe) query: ListScheduleDto) {
    return this.scheduleService.findAllDeleted(query);
  }

  @Get('designation')
  @ApiOperation({ summary: 'Buscar horário completo pela designação' })
  findOneByDesignation(@Query() query: FindScheduleByDesignationDto) {
    return this.scheduleService.findOneByDesignation(query);
  }
  @Get('by-ano-periodo-grade')
  @UsePipes(new ValidationPipe({ transform: true }))
  async findSchedulesByAnoPeriodoGrade(
    @Query() query: FindSchedulesByGradeDto,
  ) {
    return this.scheduleService.findSchedulesByAnoPeriodoGrade(
      query.anoLectivo,
      query.periodo,
      query.gradeCurricular,
    );
  }
  @Get(':id')
  @ApiOperation({ summary: 'Buscar horário completo por ID' })
  @ApiParam({ name: 'id', example: 13047 })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.findOneById(id);
  }

  // ================ CRIAÇÃO (O QUE ESTAVA A DAR ERRO) ================
  @Post(':userId')
  @RequiredPermissions(PermissionTypeDetails.CRIAR_HORARIO.sigla)
  @ApiOperation({ summary: 'Criar novo horário de uma UC' })
  @ApiParam({ name: 'userId', type: Number, description: 'ID do usuário' })
  @ApiResponse({ status: 201, description: 'Horário criado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  async create(
    @Param('userId', ParseIntPipe) userId: number,
    @Body(ValidationPipe) createScheduleDto: CreateScheduleDto,
    @Req() req: any
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const user = req.user
   const schedule= await this.scheduleService.create(user.sub, createScheduleDto);
    await AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${user?.nome} Criou Horário ${schedule.horarioId}`,
      fkAcesso: 6,
      fkFuncionalidade: 91,
      fkUtilizadorResponsavel: user.sub,
      fkOperacaoLog: 7,
      ip: ip,
    });


    return schedule;

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
  @RequiredPermissions(PermissionTypeDetails.MOVIMENTAR_ESTUDANTES_POR_HORARIO.sigla)
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

  @ApiOperation({ summary: 'Excluir horário de uma UC' })
  @ApiParam({ name: 'horarioId', type: Number })
  @ApiParam({ name: 'userId', type: Number })

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
  @RequiredPermissions(PermissionTypeDetails.VALIDACAO_DOCENTE.sigla)
  validate(
    @Param('horarioId', ParseIntPipe) horarioId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const user = req.user
    AccessLogHelper.logAccess(this.httpService, {
      descricao: `Utilizador ${user?.nome} Validou Horário ID ${horarioId}`,
      fkAcesso: 6,
      fkFuncionalidade: 91,
      fkUtilizadorResponsavel: user.sub,
      fkOperacaoLog: 8,
      ip: ip,
    });
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
