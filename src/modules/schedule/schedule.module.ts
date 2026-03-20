import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { HttpModule } from '@nestjs/axios';
import { promptToCreateAndEditService } from '../academic_activities/prompt-to-create-and-edit.service';
import { AnoLectivoUtil } from '../util/current-academic-year';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicYear } from '../shared/entities/academic.year.entity';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicYear]),
   HttpModule.register({
    timeout: 5000,
    maxRedirects: 5
  }),
  BullModule.registerQueue({
    name: 'schedule_service',
  }),

  ],
  controllers: [ScheduleController],
  providers: [ScheduleService, promptToCreateAndEditService, AnoLectivoUtil],
})
export class ScheduleModule { }
