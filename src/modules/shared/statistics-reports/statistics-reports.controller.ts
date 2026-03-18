import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { StatisticsReportsService } from './statistics-reports.service';
import { CreateStatisticsReportDto } from './dto/create-statistics-report.dto';
import { UpdateStatisticsReportDto } from './dto/update-statistics-report.dto';

@Controller('statistics-reports')
export class StatisticsReportsController {
  constructor(private readonly statisticsReportsService: StatisticsReportsService) {}

  @Post()
  create(@Body() createStatisticsReportDto: CreateStatisticsReportDto) {
    return this.statisticsReportsService.create(createStatisticsReportDto);
  }

  @Get()
  findAll() {
    return this.statisticsReportsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.statisticsReportsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStatisticsReportDto: UpdateStatisticsReportDto) {
    return this.statisticsReportsService.update(+id, updateStatisticsReportDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.statisticsReportsService.remove(+id);
  }
}
