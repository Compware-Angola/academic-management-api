import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) { }
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

}
