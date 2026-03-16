import { Injectable } from '@nestjs/common';
import { CreateStatisticsReportDto } from './dto/create-statistics-report.dto';
import { UpdateStatisticsReportDto } from './dto/update-statistics-report.dto';

@Injectable()
export class StatisticsReportsService {
  create(createStatisticsReportDto: CreateStatisticsReportDto) {
    return 'This action adds a new statisticsReport';
  }

  findAll() {
    return `This action returns all statisticsReports`;
  }

  findOne(id: number) {
    return `This action returns a #${id} statisticsReport`;
  }

  update(id: number, updateStatisticsReportDto: UpdateStatisticsReportDto) {
    return `This action updates a #${id} statisticsReport`;
  }

  remove(id: number) {
    return `This action removes a #${id} statisticsReport`;
  }
}
