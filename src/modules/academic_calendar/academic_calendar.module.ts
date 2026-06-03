import { Module } from '@nestjs/common';
import { AcademicCalendarService } from './academic_calendar.service';
import { AcademicCalendarController } from './academic_calendar.controller';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicYear } from '../shared/entities/academic.year.entity';

@Module({
  controllers: [AcademicCalendarController],
  providers: [AcademicCalendarService, AnoLectivoUtil],
  imports: [TypeOrmModule.forFeature([AcademicYear])],
})
export class AcademicCalendarModule { }
