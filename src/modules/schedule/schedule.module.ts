import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { HttpModule } from '@nestjs/axios';
import { promptToCreateAndEditService } from '../academic_activities/prompt-to-create-and-edit.service';

@Module({
 imports:[HttpModule.register({
    timeout: 5000,
    maxRedirects: 5
  })],
  controllers: [ScheduleController],
  providers: [ScheduleService,promptToCreateAndEditService],
})
export class ScheduleModule {}
