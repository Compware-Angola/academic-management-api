import { Module } from '@nestjs/common';
import { DisciplineService } from './discipline.service';
import { DisciplineController } from './discipline.controller';
import { ConfigurationPlaneService } from './configuration-plane.service';

@Module({
  controllers: [DisciplineController],
  providers: [DisciplineService, ConfigurationPlaneService],
  exports: [DisciplineService, ConfigurationPlaneService]
})
export class DisciplineModule { }
