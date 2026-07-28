import {
  Controller,
  Get,

  ValidationPipe,
  Query,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

import { ScheduleService } from './schedule.service';

import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { ListScheduleDto } from './dto/list-schedule.dto';

@Controller('schedule-portal')
export class SchedulePortalController {
  constructor(
    private readonly scheduleService: ScheduleService,
  ) { }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar horário completo por ID' })
  @ApiParam({ name: 'id', example: 13047 })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.findOneById(id);
  }
}
