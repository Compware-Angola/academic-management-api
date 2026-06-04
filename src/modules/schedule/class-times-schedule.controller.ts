import { Body, Controller, Get, Param, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ClassTimesScheduleService, TemposDisponiveisResult } from './class-times-schedule.service';
import { GetAvailableTimesDto } from './dto/get-avaliable-times.dto';




@Controller('class-times-schedule')
export class ClassTimesScheduleController {
    constructor(
        private readonly service: ClassTimesScheduleService,
    ) { }

    @Get()

    async getAvailableTimes(
        @Query(ValidationPipe) { anoLectivo, periodo, diaSemana }: GetAvailableTimesDto,
    ): Promise<TemposDisponiveisResult> {
        return this.service.getAvailableTimes(anoLectivo, periodo, diaSemana);
    }
}