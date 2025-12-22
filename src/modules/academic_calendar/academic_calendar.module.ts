import { Module } from '@nestjs/common';
import { AcademicCalendarService } from './academic_calendar.service';
import { AcademicCalendarController } from './academic_calendar.controller';

@Module({
  controllers: [AcademicCalendarController],
  providers: [AcademicCalendarService],
})
export class AcademicCalendarModule {}
