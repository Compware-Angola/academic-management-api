import { Module } from '@nestjs/common';
import { StatisticsReportsService } from './statistics-reports.service';
import { StatisticsReportsController } from './statistics-reports.controller';

@Module({
  controllers: [StatisticsReportsController],
  providers: [StatisticsReportsService],
})
export class StatisticsReportsModule {}
