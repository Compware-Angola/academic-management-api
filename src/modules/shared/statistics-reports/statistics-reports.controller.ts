import { Controller, Get, Query } from '@nestjs/common';
import { StatisticsReportsService } from './statistics-reports.service';

@Controller('statistics-reports')
export class StatisticsReportsController {
  constructor(private readonly statisticsReportsService: StatisticsReportsService) {

  }

  @Get('/dashboard')
  dashboard(@Query('anoLectivo') anoLectivo?: number) {
    return this.statisticsReportsService.dashboardStatisticsReports(anoLectivo);
  }
}
