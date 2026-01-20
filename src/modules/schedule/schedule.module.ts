import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
 imports:[HttpModule.register({
    timeout: 5000,
    maxRedirects: 5
  })],
  controllers: [ScheduleController],
  providers: [ScheduleService],
})
export class ScheduleModule {}
