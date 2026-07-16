import { Module } from '@nestjs/common';
import { StatisticsReportsService } from './statistics-reports.service';
import { StatisticsReportsController } from './statistics-reports.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicYear } from '../entities/academic.year.entity';
import { AnoLectivoUtil } from 'src/modules/util/current-academic-year';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicYear])],
  controllers: [StatisticsReportsController],
  providers: [StatisticsReportsService, AnoLectivoUtil],
  exports: [StatisticsReportsService],
})
export class StatisticsReportsModule { }
