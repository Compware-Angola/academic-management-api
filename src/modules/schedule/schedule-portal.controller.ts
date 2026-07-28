import {
  Controller,
  Get,

  ValidationPipe,
  Query,

} from '@nestjs/common';

import { ScheduleService } from './schedule.service';

import { ApiOperation, } from '@nestjs/swagger';
import { ListScheduleDto } from './dto/list-schedule.dto';

@Controller('schedule-portal')
export class SchedulePortalController {
  constructor(
    private readonly scheduleService: ScheduleService,
  ) { }

  @Get()

  @ApiOperation({
    summary: 'Listar horários com filtros avançados e paginação',
  })
  findAll(@Query(ValidationPipe) query: ListScheduleDto) {
    return this.scheduleService.findAll(query);
  }
}
